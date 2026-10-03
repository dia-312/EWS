# Developer handover

For the next developer. The shop owner's manual is [`owner-guide.ar.md`](owner-guide.ar.md); the feature spec is `electronics_store_full_agent_spec.md`; decisions and their reasons are in `TECH_STACK.md`. Read `AGENTS.md` too: this is a recent Next.js (16) and some APIs differ from older versions.

Author and original developer: **Dia'a Yaqub Arar** (ضياء يعقوب عرار), diaararx@gmail.com, +972 56 820 7267, https://github.com/dia-312. © 2026 Dia'a Yaqub Arar.

## What this is

A reusable digital storefront for local electronics shops: public catalogue in Arabic (RTL) and English, a private admin the owner runs alone, no customer accounts, contact by WhatsApp or phone. **One deployment serves one store**, chosen by `STORE_SLUG`. The database schema keeps `store_id` everywhere so a deployment could later host several stores, but no multi-tenant routing exists.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres 17, RLS, Auth, Storage) with `@supabase/ssr` · next-intl 4 · Zod 4 · Zustand 5 · `@dnd-kit` · `uqr` · Vitest · Playwright · pnpm 12 · Node 22 (`.node-version`; 24 works locally).

Hosting: **Cloudflare Workers** through `@opennextjs/cloudflare`, built by Workers Builds from GitHub `main`.

## Repository map

```
src/app/(storefront)/[locale]/   public pages (/ar, /en): home, products, categories, product, favorites, compare
src/app/admin/(panel)/           admin: dashboard, products (+import/export), categories, offers, homepage,
                                 notifications, reviews, appearance, settings, team, account
src/app/admin/login, refresh/    sign-in, and the client page that refreshes an expired session
src/app/api/                     track, products, health, notifications/subscribe, reviews
src/app/manifest.ts, pwa-icon/   web app manifest and the icons drawn in code
src/components/{storefront,admin,ui,shared}/
src/lib/                         pure logic (each has a *.test.ts), catalog queries, auth, memo cache
src/config/                      env, locales, theme presets
messages/{ar,en}.json            all text (namespaces: admin, store, specs); a test enforces identical keys
supabase/migrations/             schema, in order (see below); seed.sql; scripts/grant_admin.sql
e2e/                             Playwright specs; auth.setup.ts, credentials.ts, fixtures.ts
public/sw.js, offline.html       service worker (static assets only) and the offline page
worker.ts                        Cloudflare entry: OpenNext worker + the scheduled keep-alive
wrangler.jsonc                   worker name, vars, cron
```

## Accounts and configuration

| Thing | Where |
|---|---|
| Code | GitHub repository (public: Actions are free; it contains no secrets) |
| Hosting | Cloudflare Workers, worker name **`ews`** (must equal `name` in `wrangler.jsonc` and the project name) |
| Data, logins, images | Supabase project (free tier). Region `ap-southeast-2` (Sydney) |
| Domain | the owner's registrar; attach through Cloudflare → worker → Custom Domains |

Configuration lives in files, not in dashboards:

- `wrangler.jsonc` → `vars`: `STORE_SLUG`, `STOREFRONT_CACHE_SECONDS` (30); the cron `0 3 */2 * *`. `wrangler deploy` **deletes variables that exist only in the dashboard**, so keep them here.
- `.env.production` (committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. All public by design. **Do not also set them as dashboard build variables**: those override the file, and a pasted masked value caused "Invalid API key".
- `NEXT_PUBLIC_SITE_URL` feeds canonical URLs, the sitemap, share links, QR codes and the manifest. Change it when the domain changes. Printed QR codes keep pointing at the old URL, so keep the old one alive.
- The Supabase **service-role key is not used by the app.** It appears only in CI (`e2e/auth.setup.ts`, local stack) and `.env.example`. Never commit it or prefix it `NEXT_PUBLIC_`.

## Run it locally

```bash
pnpm install
cp .env.example .env.local        # fill in a Supabase project (a dev project, or the local stack below)
pnpm dev
```

On Windows inside the Claude desktop app, `next-intl` → `@swc/core` fails with `ERR_SWC_NATIVE_CACHE`. Point the cache at the project: `$env:SWC_NATIVE_BINDING_CACHE = "$PWD\.swc-cache"` (git-ignored). Linux/Cloudflare builds are unaffected. Local `opennextjs-cloudflare build` fails on Windows (symlink EPERM): builds run on Cloudflare.

Local database (needs Docker): `supabase start`, then `supabase db reset` applies every migration and `seed.sql` (store `ews`, 4 categories, 8 brands, 12 sample products, one live offer, 9 homepage sections).

## Database

Migrations in `supabase/migrations`, applied to the real project with the Supabase CLI (`supabase db push`, after `supabase link`). They are **append-only**: add a new file, never edit an applied one.

| # | What |
|---|---|
| 01–03 | extensions and helpers; core tables; RLS, grants, storage buckets/policies |
| 04 | storage SELECT policy for editors (without it `remove()` silently deletes nothing) |
| 05–06 | `search_products()` RPC (Arabic-normalised text search, filters, sort), then `p_ids` |
| 07 | `analytics_summary()` for the dashboard |
| 08 | `store_settings.hero_image_url` |
| 09 | `product_stats` (view counts, trigger on analytics), "popular" sort, top categories |
| 10 | notification requests: columns, unique index, anonymous insert policy |
| 11 | `product_reviews` (+ RLS) and `search_products()` returning rating average/count |
| 12 | team functions: `team_members`, `add_team_member`, `set_team_role`, `remove_team_member` |

Rules that keep it safe:

- **RLS is the security boundary.** Visitors read only active public content; admins write only their own store (`is_store_member`, `can_edit_store`); owners manage the team. Every table has RLS on.
- Anonymous visitors can only **insert** into `analytics_events`, `notification_subscriptions` and `product_reviews`, with `WITH CHECK` limits (reviews and requests must be `pending`). They can read nothing of those.
- `search_products()` and `analytics_summary()` are `security invoker`; the team functions are `security definer` (they read `auth.users`) and each checks the caller is an owner. New `security definer` functions need `revoke execute … from public, anon`.
- Postgres cannot change a function's return type in place: `drop function` then `create function` (see migration 11).
- Generated types are kept by hand in `src/types/database.types.ts`; update it with each migration.

## Auth model

- No `proxy.ts` / `middleware.ts` (experimental on OpenNext). Admin pages call `requireAdmin()` / `requireEditor()` / `requireOwner()` (`src/lib/auth.ts`), which validate the token with `getUser()` and check membership of this deployment's store. Roles: owner, manager, editor, viewer (read-only).
- An expired access token looks anonymous on the server, so anonymous requests go to `/admin/refresh`, a client page that lets the browser refresh once.
- Admins are never created by the app. Create the login in the Supabase dashboard (Auto Confirm), then connect it in Admin → Team, or run `supabase/scripts/grant_admin.sql` for the first owner. "Allow new users to sign up" must stay **off**.

## Caching and performance

- Round trips dominate: the database is far from the edge (~0.4 s each). Pages use one query (`getStorefront()`), and public reads go through the in-memory stale-while-revalidate cache `src/lib/memo.ts` (30 s; settings, theme, brands, sections 2×). Owner edits therefore show within ~30–60 s.
- Only functions using the cookie-less public client go through `memoizeAsync`. Never cache anything that depends on who is asking.
- Biggest remaining win: a Supabase project in Europe. A project's region cannot be changed, so this means a new project plus migrating schema, seed, admin logins and storage objects.
- No `loading.tsx` on purpose (see `TECH_STACK.md`).

## Tests and CI

- `pnpm test` (Vitest, ~200 unit tests), `pnpm typecheck` (`next typegen && tsc`), `pnpm lint`, `pnpm test:e2e`.
- `.github/workflows/ci.yml`: **checks** (lint, types, unit tests, build) and **e2e**. The e2e job starts a throwaway local Supabase (migrations + seed), builds the app against it, starts it on :3000 (cache off) and :3001 (cache on), and runs the Playwright projects `setup → anonymous / admin / cache`. Test accounts (`e2e/credentials.ts`) exist only in that local stack; `auth.setup.ts` refuses to run against a non-local `SUPABASE_URL`.
- `anonymous` specs assume the pristine seed; `admin` specs create and clean up their own data, run in file order, with `retries: 0`.
- Sign-out revokes all sessions of an account, so tests that sign out or change a password use their own account.
- Results are readable without a login through the GitHub API (failed steps are annotated by `scripts/ci/annotate-failure.sh`).
- Keyboard drag tests wait for `[data-sortable-ready]` (hydration) and press keys only after pick-up is announced.

## Deploying

Push to `main`; Cloudflare Workers Builds runs `pnpm exec opennextjs-cloudflare build` then `… deploy`. Merge only when CI is green. Apply new migrations to the real project **before** merging code that needs them (`supabase db push`).

`worker.ts` wraps the OpenNext worker (`.open-next/worker.js`) and adds the scheduled handler that calls `/api/health` every other day, so the free Supabase project is never idle for a week.

## Selling it to another shop

1. New Supabase project in the shop owner's account → `supabase link`, `supabase db push`, load a seed for the store (copy `seed.sql`, change slug/categories/brands/products, no fake contact details).
2. Create the owner's login in Supabase and run `grant_admin.sql` with their email and the store slug. Turn off sign-ups.
3. New Cloudflare account/project in the owner's name, connected to a copy of the repository. In `wrangler.jsonc` set `name`, the self-reference `service`, and `STORE_SLUG`; in `.env.production` set the Supabase URL, anon key and `NEXT_PUBLIC_SITE_URL`.
4. Attach the domain. Set `NEXT_PUBLIC_SITE_URL` to it.
5. Walk through the owner's "first ten minutes" (WhatsApp number, logo, hours, theme).
6. Hand over the accounts; see `handover-checklist.ar.md`.

## Runbook

| Symptom | Likely cause and fix |
|---|---|
| Site loads, no products, 500s on catalogue pages | Supabase project paused. Dashboard → Restore project. Check the Cloudflare cron ran (Worker → Logs) |
| Deploy fails with "Invalid API key" | A masked value saved as a dashboard build variable. Delete dashboard build variables; values come from `.env.production` |
| Deploy succeeds but variables vanished | They were dashboard-only. Put them in `wrangler.jsonc` `vars` |
| Admin shows "not allowed" for a real owner | No `admin_profiles` row for that login in this store: Admin → Team, or `grant_admin.sql` |
| New migration not visible | Not pushed: `supabase db push`. Check `schema_migrations` |
| Images fail to upload | Bucket policy: editors write only under `<store_id>/…`; check the file type and the 20 MB input limit |
| Edits take a minute to show | The 30 s cache. Intended |
| Storage fills up | Free tier 1 GB; images are WebP ≤ 1600 px. Delete unused products or upgrade the plan |

## Known limits and ideas

- No automatic sending for restock/price notifications (needs an email/SMS provider and a secret key); the owner contacts customers with prefilled links.
- No "forgot password" email flow in the site; password resets are done in the Supabase dashboard (SMTP must be configured there for emails).
- Supabase free has no automatic backups: the owner exports products as CSV; a full dump needs `supabase db dump`.
- No `.xlsx` reading (CSV UTF-8 only); CSV import does not carry images or specs.
- Rating filter intentionally absent until there are enough reviews.
- Cart, checkout and payments are out of scope (spec release 3+); AI assistant is a "coming soon" dialog that makes no AI call.
- Analytics events are not purged; add a scheduled delete if volume grows.
