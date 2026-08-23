# Anvelope Ungheni — internal service management app

Next.js app the tire shop uses to write service records (fișe), manage clients,
tire stock and the tire hotel. It is an internal tool: staff log in and record
work. It is **not** a public-facing website.

## What this repository owns

| Resource | Value |
|---|---|
| GitHub repo | `raunchy1/anvelope-ungheni` |
| Vercel project | `anvelope-ungheni` (`prj_cvq9VyIj7jMyc8xL62EPgrUFNqVo`) |
| Production URL | https://anvelope-ungheni.vercel.app |
| Supabase project | `gbdyzojsevqceiexkhxo` |
| Production branch | `main` |

Deploys reach production through the Vercel GitHub integration on every push to
`main`, plus `.github/workflows/deploy.yml`. Nothing else should deploy here.

## What this repository must never touch

There is a **separate** project — a public tire catalog / e-commerce site for the
same business ("Шины в Унгенах", Russian-language, with `products`, `brands` and
`orders` tables in its own Supabase project). Same business, different software.

Never deploy that site to the `anvelope-ungheni` Vercel project, never point this
app at its database, and never run `vercel --prod` from this repository. If work
on the catalog site comes up, it belongs in its own repo, its own Vercel project
and its own Supabase project.

## Why `src/lib/supabase-config.ts` exists

On 2026-08-23 a manual `vercel --prod` from the catalog site's folder landed on
this Vercel project. It replaced the app's code *and* overwrote the project's
Supabase environment variables, so the app started querying the catalog's
database. Every table lookup failed with `PGRST205` and the whole app rendered
empty — staff reported all records as deleted. Nothing had been deleted; only
the connection pointer had changed.

`supabase-config.ts` is the single place any Supabase client is configured. It
pins the project above, and defers to `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` only while those name that same project. So
clobbered or missing environment variables can no longer silently redirect the
app at someone else's data.

Build Supabase clients through `src/lib/supabase.ts` (browser) or
`src/lib/supabase-server.ts` (server). Do not read the Supabase environment
variables directly anywhere else.

## Pricing

Service prices come from the shop's printed price board, and the board is the
source of truth — not the database. `src/lib/price-fallbacks.ts` holds the board
values; `getVulcPrice` and `getExtraPrice` return them and consult the database
only for entries the board does not list. Stale `preturi_*` rows therefore cannot
change what a customer is charged. When the shop raises a price, edit that file.

## Known security issue

This repo is public and older helper scripts (`scripts/exec-supabase-sql.js`,
`scripts/apply-sql.js`, `scripts/setup-supabase.js`) contain a hardcoded Supabase
`service_role` key, which bypasses row level security entirely. The keys need
rotating and the scripts need moving to environment variables; until then treat
the database as compromised-in-principle. The anon key in `supabase-config.ts` is
a different matter — it is public by design and gated by row level security.
