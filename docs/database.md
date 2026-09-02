# Database notes for tiggl

## Host

- Provider: Supabase PostgreSQL (`supabase-tay-digital`)
- Project ref: `bppqtotktgchvitcmbmj`
- Region: `eu-west-2`
- Database: `postgres`
- Data API: disabled for `tiggl` and `tiggl_auth`

Do not re-apply already-recorded versions in `db/migrations/` against `supabase-tay-digital`. Apply new files once as `tiggl_owner`, then record them in `tiggl.schema_migrations`.

## Schemas and roles

| Kind             | Name                               |
| ---------------- | ---------------------------------- |
| Domain schema    | `tiggl`                            |
| Auth schema      | `tiggl_auth` (unused, stays empty) |
| Owner (no login) | `tiggl_owner`                      |
| Runtime (login)  | `tiggl_runtime`                    |
| Migrator (login) | `tiggl_migrator`                   |

## ORM and migrations

- ORM: none (SQL migrations + postgres.js at runtime)
- Migration directory: `db/migrations`
- Ledger: `tiggl.schema_migrations`

Apply as `tiggl_migrator` after `SET ROLE tiggl_owner` for **new** migrations only.

## Connection modes

| Environment                | Mode                                                    |
| -------------------------- | ------------------------------------------------------- |
| Persistent server          | Direct connection (IPv6) or session pooler              |
| Serverless / edge (Vercel) | Supavisor transaction mode; disable prepared statements |
| Migrations, dump, restore  | Direct or session mode only                             |

Runtime `search_path`: `tiggl, tiggl_auth`. Queries still use `tiggl.tiggl_high_scores` and `tiggl.tiggl_plays`.

## Local vs production scores

`next dev` and Vercel preview never read or write `tiggl.tiggl_high_scores` or `tiggl.tiggl_plays`. They use the in-memory fixtures in `src/lib/highScores.examples.ts` so the sidebar has test data. Scores entered locally stay in that process only.

Only `VERCEL_ENV=production` uses the shared host.

## Environment variables

Names only. Never commit values. Never prefix these with `NEXT_PUBLIC_`.

- `DATABASE_HOST` — `aws-0-eu-west-2.pooler.supabase.com` for Vercel
- `DATABASE_PORT` — `6543` for transaction mode
- `DATABASE_NAME` — `postgres`
- `DATABASE_USER` — `tiggl_runtime.bppqtotktgchvitcmbmj` on the pooler
- `TIGGL_RUNTIME_PASSWORD`

## Auth

Tiggl has no accounts. Do not add Better Auth, `BETTER_AUTH_*` env vars, or tables in `tiggl_auth`. High scores are unauthenticated server writes as `tiggl_runtime`.

## Extensions

None beyond platform defaults (`pgcrypto`, `uuid-ossp`).

## Storage

Bucket prefix: `tiggl_`

| Bucket | Purpose |
| ------ | ------- |
| none   |         |

## Functions, cron, webhooks, Realtime

- `tiggl.tiggl_high_scores` — saved names and scores
- `tiggl.tiggl_plays` — one row per finished round (month / all-time counts)
- `tiggl.tiggl_high_scores_normalize()` — `BEFORE INSERT` on `tiggl.tiggl_high_scores`; invoker security; `search_path` empty
- Cron jobs: none
- Webhooks: none
- Realtime publications: none

## Data API

Off. Scores are read and written by Next.js server actions as `tiggl_runtime`. Do not add `tiggl` to the Data API extra-schemas list without a separate review, RLS tests, and this file updated.

## Backup

Dumps and host isolation checks live in the `supabase` repo (`apps/tiggl/db/`), not here. This repo only keeps the SQL migrations the app applies.

## Data retention

Keep all-time high scores and play rows until a product decision says otherwise.
