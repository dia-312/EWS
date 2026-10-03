# Tech Stack & Technical Decisions

Companion to `electronics_store_full_agent_spec.md`. The spec stays the source of truth for features; this file records the technology choices made while planning.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | SSR for SEO, route handlers for the API, middleware to protect `/admin` |
| Styling | Tailwind CSS + shadcn/ui (Radix) | Theme tokens as CSS variables, loaded from `store_theme`. Use logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) so RTL works without overrides |
| Database / Auth / Storage | Supabase Cloud (Postgres, RLS, Auth, Storage) | `@supabase/ssr`; TS types generated with `supabase gen types` |
| i18n | next-intl | `/ar` and `/en` routes, `dir` set per locale, Arabic default |
| Forms / validation | React Hook Form + Zod | Zod schemas shared between forms and API route handlers (`lib/validations`) |
| Admin tables | TanStack Table | |
| Drag & drop | dnd-kit | Homepage sections, categories, product images |
| Charts | Recharts | |
| Client state | Zustand + localStorage (persist) | Favorites, compare, recently viewed — no accounts in v1 |
| Share / QR | Web Share API + fallback dialog; `uqr` (no network, no third-party QR service) | QR links carry `?src=qr` so scans can be counted later; admin downloads SVG/PNG per product |
| Analytics | Own `analytics_events` table via `POST /api/track` (zod-validated, anonymous insert under RLS); `analytics_summary` RPC feeds the admin dashboard | No cookies and no personal data (random per-tab id); Do Not Track respected; no third-party scripts, so no consent banner needed. Old events are not purged yet (free tier is 500 MB; a year of a small shop is a few MB) |
| Keep-alive | `worker.ts` wraps the OpenNext worker and adds a Cloudflare Cron Trigger (`0 3 */2 * *`) that calls `/api/health` | Supabase free projects pause after ~1 week idle; the cron lives in the owner's Cloudflare account. If the site ever shows no products, restore the project from the Supabase dashboard |
| PWA | `app/manifest.ts` (name/colors from the store), `/pwa-icon/*` PNGs drawn in code in the primary color, a hand-written `public/sw.js`, `public/offline.html` | Installable on Android/desktop (button in the footer) and iOS (add to home screen). The worker caches only hashed build files; pages, prices and admin are never cached. Serwist was skipped on purpose: its build plugin is not proven on Turbopack + OpenNext, and this needs only ~60 lines |
| CSV import / export | Admin → Products → "Import from CSV": check (preview, nothing written) then import; `/admin/products/export` writes the same columns | Slug is the key (known slug = update, new = create); empty cell on update keeps the value; new products start hidden (no image yet); brands are created on the fly, categories must exist. Upserts go in batches of 100 because every round trip to the database costs ~0.4 s. Excel (.xlsx) is not read directly: save as CSV UTF-8. Text starting with = + - @ is guarded against spreadsheet formulas on export |
| Error screens | `error.tsx` for the storefront and the admin panel (retry button, link home) | No `loading.tsx` on purpose: pages are rendered in one piece and are fast, and a skeleton makes Next send the page in two parts, with React revealing the content a few hundred milliseconds late (it also broke tests that read the page right after it loads) |
| Site pictures | `SiteImageField` uploads (browser resizes to WebP) into `store-banners` / `category-images`, then `saveSiteImage` records the URL and deletes the old file | Homepage hero (`store_settings.hero_image_url`, dark layer keeps text readable), category pictures, offer banners, and any number of promotional banner sections (picture + optional link; links are restricted to site paths or https) |
| QR | `qrcode` | Generated from the canonical product URL |
| PWA | Serwist | Static assets only, no offline catalog promise in v1 |
| Fonts | Tajawal or IBM Plex Sans Arabic via `next/font` | Final pick during design |
| Tests | Vitest (unit) + Playwright (e2e, RTL + mobile viewports) | |
| Tooling | pnpm, ESLint, Prettier | |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`), built by Cloudflare Workers Builds from GitHub `main` | Verified 2026-10-02 on the free plan: the SSR home page reading Supabase returned 200 on 20/20 sequential requests (~0.85 s each from a remote client). Vercel Hobby is ruled out (non-commercial use only). Local OpenNext builds fail on Windows (symlink EPERM), so builds run on Cloudflare. `proxy.ts` (Node middleware) is experimental on OpenNext: prefer server-side auth checks, and legacy `middleware.ts` if middleware is needed. Recheck CPU limits once real catalog pages exist |

## Single store now, resellable later

- One deployment = one store. The active store is resolved from the `STORE_SLUG` env var.
- The schema keeps `stores` and `store_id` on every business table, as in the spec, but no multi-tenant logic (domain routing, tenant onboarding) is built in v1.
- All store-specific data (name, logo, contact, theme, products) lives in the database and is loaded by a seed script. Nothing store-specific is hardcoded.
- Selling to another store = new Supabase project + new Vercel project + new seed file + new env vars.

## Cost & handover

The store owner receives full ownership: all accounts (Supabase, hosting, domain, GitHub if code is handed over) are in the owner's name and paid by them directly. Target running cost is the domain only; everything else on free tiers with mitigations:

- **Supabase free pauses after inactivity and has no automatic backups.** Add a scheduled keep-alive and a scheduled export of the data (products/offers as CSV, plus the DB dump) so the owner is never left without a copy.
- **Hosting must allow commercial use on the free plan.** Verify a Next.js deploy on Cloudflare (OpenNext) early; fall back to Netlify free. Vercel only if the owner agrees to pay.
- **Password-reset email** needs a free SMTP provider (e.g. Resend or Brevo free tier); Supabase's default mailer is too limited.
- **Images**: compress to WebP before upload to stay inside the free storage/egress limits.
- **Monitoring**: free uptime monitor and free error tracking, so problems are seen before the owner reports them.
- **Upgrade path**: if traffic or data outgrows free limits, upgrading is a plan change on the owner's accounts, not a rewrite.

## Deployment notes (Cloudflare)

- Build command: `pnpm exec opennextjs-cloudflare build`; deploy command: `pnpm exec opennextjs-cloudflare deploy`.
- `wrangler deploy` deletes variables that exist only in the dashboard, so runtime variables (`STORE_SLUG`) live in `wrangler.jsonc` under `vars`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` live in the committed `.env.production` (public by design). Do not also set them as dashboard build variables: dashboard values override the file, and a pasted masked value ("••••") caused "Invalid API key".
- Selling to another store: change `STORE_SLUG` in `wrangler.jsonc` and the two public values in `.env.production`, and point the deployment at the new store's own Supabase project.

## Auth notes

- No `proxy.ts`/`middleware.ts`: it is experimental on OpenNext (Node runtime). Admin pages are guarded on the server by `requireAdmin()` (`src/lib/auth.ts`), which validates the token with `getUser()` and checks membership of the deployment's store.
- An expired access token looks anonymous on the server, so anonymous requests go to `/admin/refresh`, a client page that lets the browser refresh the session once and returns to the dashboard or the login page.
- Admins are never created by the app. Create the user in the Supabase dashboard (Auto Confirm), then run `supabase/scripts/grant_admin.sql`. Turn off "Allow new users to sign up" in Authentication settings.

## Local build quirk (Windows + Claude desktop app)

`next-intl` loads `@swc/core`, whose native addon refuses to load when `%LOCALAPPDATA%` has an ACL entry for the app sandbox (`ERR_SWC_NATIVE_CACHE`). Work around it by pointing the cache at the project folder (already git-ignored):

```powershell
$env:SWC_NATIVE_BINDING_CACHE = "$PWD\.swc-cache"
```

Cloudflare builds on Linux are not affected.

## Automated checks (CI)

`.github/workflows/ci.yml` runs on every push and pull request:

- **checks**: lint, `next typegen` + `tsc`, Vitest unit tests, production build.
- **e2e**: starts a throwaway local Supabase stack (migrations + `seed.sql` on a fresh database), builds the app against it, and runs the Playwright suite in `e2e/`: public pages, sign-in/out and roles, anonymous database limits, categories, products with image upload, settings, appearance.
- Test accounts (`e2e/credentials.ts`) exist only in that local stack; `e2e/auth.setup.ts` refuses to create them unless `SUPABASE_URL` is local. They never touch the real project.
- Failed steps are summarised as annotations (`scripts/ci/annotate-failure.sh`), so results can be read from the public API without downloading logs.
- Run locally with Docker: `supabase start`, export the URL/keys as `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, build/start the app with the matching `NEXT_PUBLIC_*` values, then `pnpm test:e2e`.
- The repository is public so Actions are free and results are readable anonymously. It contains no secrets: the anon key and URL are public by design and the service-role key is never committed.

Pitfalls found by these tests and fixed:

- React 19 resets uncontrolled fields after a form `action` finishes, even on validation errors. Forms use `useActionForm` (submit from `onSubmit`) so typed values survive.
- Supabase Storage looks objects up under the caller's role; without a SELECT policy `remove()` silently deletes nothing. See `20261003000004_storage_editor_select.sql`.
- `signOut()` revokes every session of an account, so tests that sign out must use their own account.

## Performance

- **Round trips dominate.** The Supabase project is in `ap-southeast-2` (Sydney) while visitors and the Cloudflare edge (`ZDM`, Palestine) are far away, so one database round trip costs about 0.4 s. Pages used to need 3-5 in sequence (1.5-2.2 s).
- **One query per page.** `getStorefront()` loads store, settings, theme and categories together; the product page loads its live offer with the product.
- **In-memory stale-while-revalidate cache** (`src/lib/memo.ts`) for public data: `STOREFRONT_CACHE_SECONDS` (default 30 in production, 0 in development and in the main e2e run; settings/theme/brands/sections use 2x). Visitors get cached data at once and one background refresh per entry updates it. Result on the live site: about 0.1 s for repeat visits, 0.45-0.8 s for the first visit to a URL.
- **Consequence for the owner:** a change made in the admin appears on the public site within about 30 s (60 s for settings and theme), after one more page view. Admin pages are never cached.
- Never cache anything that depends on who is asking; only functions using the cookie-less public client go through `memoizeAsync`.
- **Biggest remaining win: move the database closer** (for example Frankfurt, `eu-central-1`). Supabase cannot change a project's region, so this means a new project plus migrating schema, seed, admin account and storage. It would cut the cold path to roughly 0.1-0.2 s.

## Development environment

- Supabase Cloud project (free tier) for development. Migrations live in `supabase/migrations` and are applied with the Supabase CLI.
- Service-role key stays server-side only and is never prefixed with `NEXT_PUBLIC_`.

## Decisions on spec gaps

1. **Arabic search.** Postgres full-text search has no Arabic stemmer. Use `pg_trgm` + `unaccent` over a normalized `search_text` column (unify alef forms, ta marbuta/ha, remove diacritics) and add a `search_aliases` field to products for Arabic/English aliases. The spec's schema does not include aliases yet.
2. **Images.** Supabase image transformations are not on the free plan. Compress and convert to WebP in the browser before upload, then serve through `next/image`.
3. **Offers.** The `offers` table is the single source of truth. A product's "on sale" state is derived from its active offer (inside its start/end window). `products.price` is the regular price and the schema deliberately has no `products.old_price`; the offer carries the old/new price pair.
4. **Badges.** Must be data-driven (spec A8) but the schema has no place for them. Add a `badges` representation (table or column) to the schema before building the product editor.

## Environment prerequisites

- Node.js LTS (24.x, installed via winget) and pnpm (installed with `npm install -g pnpm`; `corepack enable` fails without admin rights on Windows).
- Git repository initialized on branch `main`.
- Supabase CLI — installed through pnpm/npx when needed.
- A Supabase Cloud project and a Vercel account.
