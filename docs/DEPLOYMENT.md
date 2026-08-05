# KC TELECOM — Deployment Guide

Containerized deployment using the project's `docker-compose.yml`, `Dockerfile`
(backend), and `frontend/Dockerfile` (nginx-served SPA).

## 1. Environment setup

Copy `.env.example` to `.env` in the project root and fill in production values:

```
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://<prod_user>:<prod_password>@postgres:5432/kc_telecom?schema=public"
JWT_SECRET="<long random secret>"
JWT_EXPIRES_IN="1d"
ADMIN_EMAIL="<real admin email>"
ADMIN_PHONE="<real admin phone>"
ADMIN_PASSWORD="<strong password>"
POSTGRES_USER=<prod_user>
POSTGRES_PASSWORD=<prod_password>
POSTGRES_DB=kc_telecom
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

Note: `DATABASE_URL` must use host `postgres` (the compose service name), not
`localhost` — the backend reaches the database over the compose network.

`docker-compose.yml` requires `POSTGRES_USER`, `POSTGRES_PASSWORD`, and
`POSTGRES_DB` to be set — it will refuse to start otherwise (no insecure
fallback defaults).

## 2. Build and start

```bash
docker compose build
docker compose up -d
```

- `postgres` starts first; `backend` waits for its healthcheck.
- `backend`'s container `CMD` runs `npx prisma migrate deploy` before starting
  the API — this applies existing migrations only, no prompts.
- `frontend` waits for the backend's healthcheck (TCP check on port 3000)
  before starting.

## 3. Seed the admin account (one-time)

```bash
docker compose exec backend npx prisma db seed
```

This runs `prisma/seed.ts`, which creates the bootstrap admin from
`ADMIN_EMAIL` / `ADMIN_PHONE` / `ADMIN_PASSWORD` in `.env`.

## 4. Verify

```bash
docker compose logs -f backend
docker compose ps
```

- Backend: `http://<server>:3000/api/v1`
- Frontend: `http://<server>:8080`

Put both behind a reverse proxy with TLS for the real domain. See
`SMOKE_TEST.md` for the end-to-end verification flow to run after deploying.

## Migrations

`prisma/migrations/20260101000000_init/` contains the initial schema
migration, covering all 6 tables, 7 enums, unique indexes, the composite
`recharge_pins(batchId, status)` index, and all foreign keys exactly as
declared in `schema.prisma`.

**Provenance note:** this migration was hand-authored by translating
`schema.prisma` into Prisma's standard generated-SQL conventions, not
produced by running `prisma migrate dev` against a live database — no
database or network access was available in the environment that built this
package. It has been traced manually against the schema and against
`prisma/seed.ts` (see `PRODUCTION_CHECKLIST.md` for that trace), but it has
**not been executed against a real PostgreSQL instance**. Before relying on
it for a real production deploy, run it once against a disposable database
and confirm `prisma migrate deploy` reports success with no drift — see the
"First real verification" step in `PRODUCTION_CHECKLIST.md`.
