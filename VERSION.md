# KC TELECOM — Version Summary

## Release: v1.0.0 (GitHub-ready snapshot)

### Core platform (backend — NestJS + Prisma + PostgreSQL)
- **Authentication** — vendor self-registration, login, JWT (passport-jwt),
  bcrypt password hashing, role-based guards (`ADMIN` / `VENDOR`).
- **Wallet system** — per-vendor balance, vendor-initiated funding requests
  (`PENDING`), admin confirmation that atomically credits the wallet, full
  transaction ledger (`FUNDING`, `DEBIT`, `REFUND` types).
- **Recharge PIN stock management** — admin creates PIN batches (network,
  denomination, cost/selling price), bulk-uploads serial+PIN pairs,
  inventory summary.
- **Vendor PIN purchase flow** — stock browsing, atomic purchase transaction
  (`Serializable` isolation) that validates balance and stock, allocates
  specific PIN rows, debits the wallet, and records profit — all or nothing.
- **PIN delivery** — vendors retrieve the actual serial/code pairs for a
  completed purchase.
- **Reports** — admin sales ledger, admin profit summary, vendor spend
  summary.

### Frontend (React + TypeScript + Vite + Tailwind)
- Auth pages (login, register), protected routing by role.
- Admin: dashboard, batch creation, PIN upload, inventory, vendor list,
  sales, reports.
- Vendor: dashboard, buy PINs, purchase history, purchased PIN viewer,
  wallet, transaction history.
- API client (`src/lib/api.ts`) covering every backend route.

### Data model
6 tables (`User`, `Wallet`, `WalletTransaction`, `PinBatch`, `RechargePin`,
`PinPurchase`), 7 enums, unique constraints on email/phone/batch label/serial
number/references, composite index on `(batchId, status)` for stock lookups.

### Deployment infrastructure
- Multi-stage backend `Dockerfile` (Nest build → slim runtime), reusing the
  build stage's `node_modules` so the Prisma CLI and `ts-node` are present at
  runtime without an `npx` download.
- Multi-stage frontend `Dockerfile` (Vite build → nginx), with `nginx.conf`
  handling SPA routing (`try_files ... /index.html`).
- `docker-compose.yml` wiring postgres + backend + frontend, with
  healthchecks, no public Postgres port, no insecure credential fallbacks,
  and a non-root backend container user.
- `.dockerignore` for both backend and frontend build contexts.
- Initial Prisma migration (`prisma/migrations/20260101000000_init/`) —
  hand-authored from `schema.prisma` (no live database was available during
  generation); traced manually against the schema and seed script but not
  yet executed against a real PostgreSQL instance — see
  `docs/PRODUCTION_CHECKLIST.md` for the required first live run.

### Documentation
- `README.md` — stack, data model, Docker + local setup, roles/flow walkthrough.
- `docs/DEPLOYMENT.md` — step-by-step deployment guide.
- `docs/PRODUCTION_CHECKLIST.md` — readiness status, resolved items, open items.
- `docs/SMOKE_TEST.md` — end-to-end smoke test with concrete endpoints and payloads.
- `PROJECT_STRUCTURE.md` — full repository tree.

### Verified (via code review, not yet against a live deployment)
- Role guard correctly returns `403` for vendor tokens on admin-only routes.
- DTO validation rejects non-positive purchase quantities before any DB write.
- Over-quantity and insufficient-balance purchases roll back cleanly with no
  wallet or PIN side effects.
- Double-sale on the last available PIN is blocked by both the stock check
  and a `Serializable`-isolation re-check.
- Wallet transaction history includes both funding and purchase-debit rows.

### Known gaps (deliberately out of scope for this release)
- PIN codes stored in plaintext — encrypt at rest before real production use.
- No payment gateway integration — funding confirmation is admin/webhook-manual by design.
- No rate limiting on public endpoints (`auth/register`, `auth/login`).
- No automated test suite.
- Migration has not yet been executed against a live PostgreSQL database
  (see `docs/PRODUCTION_CHECKLIST.md`).
- `app.enableCors()` allows any origin — restrict before going live.
