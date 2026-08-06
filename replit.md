# KC TELECOM

Recharge PIN distribution platform. Admins upload PIN books; vendors fund their wallets and buy PIN batches. Built with NestJS + Prisma + PostgreSQL (backend) and React + Vite + Tailwind CSS (frontend).

## Architecture

| Layer | Stack | Port |
|-------|-------|------|
| Backend API | NestJS 10, Passport-JWT, class-validator | 3000 |
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6 | 5000 |
| Database | Replit built-in PostgreSQL (Prisma ORM) | — |

Frontend proxies all `/api/*` requests to the backend via Vite's dev-server proxy — no CORS issues and no hardcoded URLs needed.

## Running the app

Two workflows are configured:

- **Backend** — `npm run start:dev` (NestJS watch mode, port 3000)
- **Start application** — `cd frontend && npm run dev` (Vite, port 5000, the preview pane)

Start **Backend** first, then **Start application**. The login page will appear in the preview pane.

## Default admin account

Created by `prisma/seed.ts` on first run:

| Field | Value |
|-------|-------|
| Email | admin@kctelecom.com |
| Password | ChangeMe123! |

Change this password immediately in any non-development environment.

## Environment variables

Set automatically by Replit:

- `DATABASE_URL` — Replit PostgreSQL connection string (runtime-managed)

Set via Replit Secrets / Env vars:

- `JWT_SECRET` — secret key for signing JWTs (**must be set before deploying**)
- `JWT_EXPIRES_IN` — token TTL (default `1d`)
- `NODE_ENV` — `development` or `production`
- `PORT` — backend port (default `3000`)
- `ADMIN_EMAIL` / `ADMIN_PHONE` / `ADMIN_PASSWORD` — seed credentials
- `VITE_API_BASE_URL` — set to `/api/v1` (proxied through Vite)

## Database

Migrations live in `prisma/migrations/`. Schema is in `prisma/schema.prisma`.

```bash
# Apply migrations (already applied on first setup)
npx prisma migrate deploy

# Seed admin account (already seeded)
npx ts-node prisma/seed.ts

# Open Prisma Studio
npx prisma studio
```

## Key API routes (all prefixed `/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Vendor self-registration |
| POST | /auth/login | — | Login (returns JWT) |
| GET | /wallet | VENDOR | My wallet balance |
| GET | /wallet/transactions | VENDOR | My transaction history |
| POST | /wallet/fund | VENDOR | Submit funding request |
| POST | /wallet/fund/:ref/confirm | ADMIN | Confirm pending funding |
| GET | /vendor/pins/stock | VENDOR | Available PIN batches |
| POST | /vendor/pins/purchase | VENDOR | Buy PINs (atomic) |
| GET | /vendor/pins/purchases | VENDOR | My purchase history |
| GET | /vendor/pins/purchases/:id/pins | VENDOR | PIN codes for a purchase |
| POST | /admin/pin-stock/batches | ADMIN | Create PIN batch |
| POST | /admin/pin-stock/batches/:id/pins | ADMIN | Upload PINs into batch |
| GET | /admin/pin-stock/inventory | ADMIN | Inventory summary |
| GET | /reports/admin/sales | ADMIN | Sales ledger |
| GET | /reports/admin/profit-summary | ADMIN | Revenue & profit |
| GET | /reports/vendor/summary | VENDOR | Vendor's own summary |

## User preferences

- Preserve NestJS + Prisma + PostgreSQL backend and React + Vite + Tailwind frontend architecture.
- Do not introduce placeholder/mock data — all features use real database queries.
- Keep authentication (JWT), roles (ADMIN/VENDOR), wallet system, PIN management, transactions, and reports intact.
