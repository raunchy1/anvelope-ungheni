# Anvelope Ungheni — internal service management app

Next.js app the tire shop uses to write service records (fișe), manage clients,
tire stock and the tire hotel. It is an internal tool: staff log in and record
work. It is **not** a public-facing website.

## What this repository owns

| Resource | Value |
|---|---|
| GitHub repo | `raunchy1/anvelope-ungheni` (public) |
| Vercel account | `cristianermurache` (Hobby, `team_t4zcpfEWjYVmKYc7ZyJC0Uba`) |
| Vercel project | `anvelope-ungheni-fise` (`prj_r0TwG4jvkIYDp5YLFhvZqwKI07iZ`) |
| Production URL | https://anvelope-ungheni-fise.vercel.app |
| Supabase project | `gbdyzojsevqceiexkhxo` |
| Production branch | `main` |

`scat-gamma.vercel.app` was the project's first auto-assigned domain and
307-redirects to the production URL, so older bookmarks still work.

Deploys reach production through the Vercel GitHub integration on every push to
`main`. **Before pushing a fix, confirm the Vercel project is still linked to
this repository** — check `link` in the project's Vercel record. The project was
briefly linked to a copy instead (see below), and a fix pushed to the wrong
repository looks successful while never reaching production.

## The Vercel account this app used to live on

Until 9 September 2026 the app ran on the `cristiermurache-1102's projects`
account, as the project `anvelope-ungheni` at `anvelope-ungheni.vercel.app`.
That account was disabled for non-payment (HTTP 402, `DEPLOYMENT_DISABLED`):
metered charges driven by the catalog site reached roughly €40–80 per invoice,
arriving on consecutive days. The app was moved here to get it off that account.
The old project and its URL still exist there and serve nothing.

## Where the `scat` repository came from

Creating the new project through `vercel.com/new` did not link this repository —
Vercel created a **private copy** of it named `raunchy1/scat` and linked the
project to that instead. Its first commit reads "Initial commit / Created from
https://vercel.com/new". Nothing was lost, and the copy's code was byte-identical
to this repository, but for a while the live app built from the copy while this
repository looked like the source.

If a change ever appears pushed but does not reach production, check for this
first: the project may be linked to a copy rather than to this repository.

## The catalog site is a different project

There is a **separate** public tire catalog / e-commerce site — bilingual
Romanian/Russian, live at `anvelope-ungheni.md`, with `products`, `brands` and
`orders` tables in its own Supabase project (`tzzycvsbnlurypfstisc`). Same
business, different software.

It sits on **this same Vercel account**, as the project `anvelope-ungheni-site`,
and is deployed by hand with `vercel --prod` from a local folder rather than from
Git. That combination caused the two worst incidents in this app's life: a
`vercel --prod` from the catalog's folder landed on *this app's* Vercel project
and replaced it in production, twice.

Never deploy the catalog to this app's project, never point this app at the
catalog's database, and never run `vercel --prod` from this repository.

The catalog also routes roughly 3,865 product images (817 MB in Supabase
Storage) through Vercel's image optimizer, and its `robots.txt` invites crawlers
across ~15,000 product pages. That is what generated the metered spend that
disabled the old account, and the configuration has not been fixed — so the same
consumption accumulates here. On Hobby there is no overage invoice: Vercel stops
serving instead, and it stops the whole account, this app included.

## Why `src/lib/supabase-config.ts` exists

On 2026-08-23 a manual `vercel --prod` from the catalog site's folder landed on
this app's Vercel project. It replaced the app's code *and* overwrote the
project's Supabase environment variables, so the app started querying the
catalog's database. Every table lookup failed with `PGRST205` and the whole app
rendered empty — staff reported all records as deleted. Nothing had been
deleted; only the connection pointer had changed.

`supabase-config.ts` is the single place any Supabase client is configured. It
pins the project above, and defers to `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` only while those name that same project. So
clobbered or missing environment variables can no longer silently redirect the
app at someone else's data — and the app deploys correctly onto a fresh Vercel
project with no environment variables at all, which is what made moving accounts
a five-minute job instead of a migration.

Build Supabase clients through `src/lib/supabase.ts` (browser) or
`src/lib/supabase-server.ts` (server). Do not read the Supabase environment
variables directly anywhere else.

## Pricing

Service prices come from the shop's printed price board, and the board is the
source of truth — not the database. `src/lib/price-fallbacks.ts` holds the board
values; `getVulcPrice` and `getExtraPrice` return them and consult the database
only for entries the board does not list. Stale `preturi_*` rows therefore cannot
change what a customer is charged. When the shop raises a price, edit that file.

The printed board in the workshop still shows freon R134A at 0.75 lei/gram; the
app charges 0.85, which is the price the owner asked for. The board needs
reprinting, or customers will see two different figures.

## Known security issues

**Credentials in this public repository.** `scripts/exec-supabase-sql.js`,
`scripts/apply-sql.js` and `scripts/setup-supabase.js` contain a hardcoded
Supabase `service_role` key for `gbdyzojsevqceiexkhxo` — the database this app
uses. That key bypasses row level security entirely, so anyone who finds it can
read or delete every record. The owner has decided to keep the repository
public, so the key needs rotating and the scripts moving to environment
variables.

**Passwords in the client bundle.** `src/lib/auth.tsx` holds the staff logins and
passwords in plain text. Next.js ships that file to every visitor's browser, so
anyone who opens the app can read them and sign in as an administrator. The
comment in the file calls this temporary pending Supabase Auth; it has been in
production since March.

The anon key in `supabase-config.ts` is a different matter — it is public by
design and gated by row level security.

**No backups.** The ~1,775 service records and ~1,486 clients exist only in
Supabase `gbdyzojsevqceiexkhxo`, on a free plan with no point-in-time recovery.
There is no export anywhere. This is the largest unmitigated risk to the
business and the owner is aware of it.
