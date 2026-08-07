# KC TELECOM — Recharge PIN Distribution Platform

Full-stack system covering KC Telecom's core operations: admin-managed PIN
stock, vendor accounts, wallet funding, PIN purchases, PIN delivery, and
sales/profit reporting.

## Stack
- **Backend:** NestJS 10 · TypeScript · Prisma 5 · PostgreSQL 16 · JWT auth (passport-jwt) · bcrypt
- **Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · React Router
- **Deployment:** Docker (multi-stage builds), nginx (frontend), docker-compose

## Data model (prisma/schema.prisma)
- **User** — `ADMIN` or `VENDOR`, one wallet each.
- **Wallet / WalletTransaction** — balance plus an auditable ledger of every FUNDING/DEBIT.
- **PinBatch** — a "book" of PINs for one network + denomination, with `costPrice` (what KC Telecom paid) and `sellingPrice` (what vendors pay). `availableQuantity`/`totalQuantity` are always de[...]
- **RechargePin** — one physical PIN (serial + code), `AVAILABLE` or `SOLD`.
- **PinPurchase** — one vendor order: quantity, price/cost snapshot at time of sale, `totalProfit`, linked to the exact PINs allocated.

## Setup — Docker (recommended)

```bash
cp .env.example .env              # fill in real secrets/credentials
docker compose build
docker compose up -d
docker compose exec backend npx prisma db seed   # creates the first ADMIN account
```
- Backend: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:8080`

Migrations run automatically on backend container start (`prisma migrate deploy`).
Full walkthrough: `docs/DEPLOYMENT.md`.

## Setup — local development (without Docker)

Backend:
```bash
cp .env.example .env              # point DATABASE_URL at a local Postgres
npm install
npx prisma migrate dev            # applies prisma/migrations/, or creates a new one on schema changes
npx prisma db seed                # creates the first ADMIN account from .env
npm run start:dev
```

Frontend:
```bash
cd frontend
cp .env.example .env              # VITE_API_BASE_URL, defaults to localhost:3000
npm install
npm run dev
```
API is served under `http://localhost:3000/api/v1`; frontend dev server under `http://localhost:5173`.

## Roles & flow
1. **Admin** logs in with the seeded account (`POST /auth/login`), creates a
   PIN batch (`POST /admin/pin-stock/batches`) with cost/selling price, then
   bulk-uploads the actual PIN codes into it (`POST /admin/pin-stock/batches/:id/pins`).
2. **Vendor** self-registers (`POST /auth/register`, always creates role `VENDOR`,
   with an empty wallet auto-created).
3. **Vendor** requests wallet funding — the project integrates Paystack for
   wallet funding. The typical flow is:

   - Vendor calls `POST /wallet/fund` (authenticated) with `{ amount, description }` to create a funding reference.
   - Backend returns a payment initialization payload (e.g. Paystack `authorization_url` or `reference`) which the frontend uses to open the Paystack Checkout.
   - The customer completes payment in Paystack's checkout UI.
   - Paystack notifies the backend via a webhook and/or the frontend can prompt the backend to verify the transaction using Paystack's `verify transaction` endpoint (`GET /wallet/fund/:reference/verify` or equivalent server endpoint).
   - On successful verification, the server calls the same internal confirm logic used previously by the admin (the existing `WalletService.confirmFunding`), which atomically credits the vendor's wallet and records a `FUNDING` WalletTransaction.

   This removes the need for manual admin confirmation in production — payment success drives the confirmation.
4. **Vendor** browses available stock (`GET /vendor/pins/stock`) and buys
   PINs (`POST /vendor/pins/purchase`). This single DB transaction: checks
   balance and stock, allocates specific PIN rows, marks them `SOLD`, debits
   the wallet, and records a `PinPurchase` with the profit margin captured —
   all or nothing.
5. **Vendor** retrieves the actual PIN codes for an order
   (`GET /vendor/pins/purchases/:id/pins`).
6. **Admin** views the sales ledger and profit rollup
   (`GET /reports/admin/sales`, `GET /reports/admin/profit-summary`);
   vendors view their own spend (`GET /reports/vendor/summary`).

## Notes on production-hardening (deliberately out of scope for this MVP)
- **PIN code encryption at rest** — `pinCode` is stored plaintext for now; encrypt with a KMS-backed key before going live.
- **Payment gateway** — Paystack wallet funding is integrated. The server implements server-side verification with Paystack and should be configured with the Paystack secret key and a reachable webhook endpoint. See `docs/DEPLOYMENT.md` and `docs/PRODUCTION_CHECKLIST.md` for required environment variables and production checklist items.
- **Concurrency** — the purchase transaction runs at `Serializable` isolation and surfaces a `409` for the caller to retry on write conflicts under heavy concurrent load on the same batch.
- **Rate limiting, request logging, and refresh tokens** are not yet included.

## Documentation
- `docs/DEPLOYMENT.md` — full deployment walkthrough (Docker)
- `docs/PRODUCTION_CHECKLIST.md` — production readiness status and open items
- `docs/SMOKE_TEST.md` — end-to-end smoke test with real endpoints/payloads
- `PROJECT_STRUCTURE.md` — full repository folder tree
- `VERSION.md` — summary of what's implemented in this release

## Project layout
```
src/
  auth/            registration, login, JWT strategy
  wallet/          funding requests + admin confirmation, ledger
  admin/pin-stock/ batch creation, bulk PIN upload, inventory
  vendor/pin-purchase/  stock browsing, purchase, PIN retrieval
  reports/         sales ledger, profit summary
  prisma/          PrismaService (global)
  common/          guards, decorators, exception filter
prisma/
  schema.prisma
  seed.ts
  migrations/      versioned SQL migrations
frontend/
  src/pages/       admin, auth, vendor screens
  src/components/  shared UI + route guard
  src/context/     auth state
  src/lib/         API client, formatting helpers
  nginx.conf       SPA routing config for the production frontend image
docs/              deployment, production checklist, smoke test
Dockerfile         backend multi-stage production build
frontend/Dockerfile  frontend multi-stage build + nginx
docker-compose.yml   postgres + backend + frontend
```
