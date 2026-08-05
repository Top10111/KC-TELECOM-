# KC TELECOM — Production Checklist

## Blocking — must resolve before first production deploy

- [ ] **Run the migration against a real disposable PostgreSQL instance once**
      before trusting it in production (see "First real verification" below).
      `prisma/migrations/20260101000000_init/` now exists and has been traced
      manually against `schema.prisma`, but it was authored without database
      or network access in the build environment, so it has not yet been
      executed by the actual Prisma migration engine.
- [ ] `app.enableCors()` in `src/main.ts` allows any origin. Restrict to the
      real frontend domain before going live.

## First real verification (do this before go-live)

```bash
docker compose up -d postgres
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/kc_telecom?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/kc_telecom?schema=public" npx prisma db seed
```
Confirm: `migrate deploy` reports the migration applied with no errors, and
`db seed` reports "Admin account created." If `migrate deploy` reports schema
drift, run `npx prisma migrate dev` locally to let Prisma regenerate a
correct migration from the live diff, and commit that instead.

## Resolved during this project

- [x] Prisma CLI availability in the production container (backend
      `Dockerfile` now reuses the builder stage's full `node_modules`).
- [x] `prisma db seed` runtime dependency on `ts-node` (same fix as above —
      `ts-node` is now present in the runtime image).
- [x] Postgres port `5432` no longer published to the host.
- [x] Insecure default fallback for `POSTGRES_PASSWORD` (and `_USER`/`_DB`)
      removed from `docker-compose.yml` — these are now required env vars.
- [x] Backend `HEALTHCHECK` added (TCP check on port 3000); frontend's
      `depends_on` gates on it via `condition: service_healthy`.
- [x] Backend Docker image runs as non-root (`USER node`).
- [x] Initial Prisma migration created (`prisma/migrations/20260101000000_init/`),
      covering all 6 tables, 7 enums, unique/composite indexes, and foreign
      keys — traced manually against `schema.prisma` and `prisma/seed.ts`.
      Not yet executed against a live database — see the blocking item above.

## Environment variables required

Backend / compose root `.env`:
```
PORT, NODE_ENV, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN,
ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD,
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB,
VITE_API_BASE_URL
```

`DATABASE_URL` host must be `postgres` (compose service name), not `localhost`.

## Verified via code review (see SMOKE_TEST.md for the executable version)

- [x] Role-based 403s: vendor tokens correctly rejected from
      `admin/pin-stock/*` and `reports/admin/*` routes (`RolesGuard`).
- [x] `quantity = 0` purchase rejected by DTO validation
      (`@IsPositive()` + global `ValidationPipe`) before any DB write.
- [x] Over-quantity and insufficient-balance purchases rejected inside the
      purchase `$transaction` before any wallet debit or PIN allocation —
      rolls back cleanly on error.
- [x] Double-sale on the last available PIN is blocked twice over: the
      `availableQuantity` check, and a `Serializable`-isolation re-check of
      `AVAILABLE` PIN rows that throws `ConflictException` on a race.
- [x] `GET /wallet/transactions` returns both `FUNDING` and `DEBIT` rows.

## Not yet covered

- [ ] Load/concurrency testing beyond the single-race case above.
- [ ] Backup/restore procedure for the Postgres volume.
- [ ] Log aggregation / monitoring / alerting setup.
- [ ] Rate limiting on public endpoints (`auth/register`, `auth/login`).
