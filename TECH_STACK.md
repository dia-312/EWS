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
| QR | `qrcode` | Generated from the canonical product URL |
| PWA | Serwist | Static assets only, no offline catalog promise in v1 |
| Fonts | Tajawal or IBM Plex Sans Arabic via `next/font` | Final pick during design |
| Tests | Vitest (unit) + Playwright (e2e, RTL + mobile viewports) | |
| Tooling | pnpm, ESLint, Prettier | |
| Hosting | Vercel | |

## Single store now, resellable later

- One deployment = one store. The active store is resolved from the `STORE_SLUG` env var.
- The schema keeps `stores` and `store_id` on every business table, as in the spec, but no multi-tenant logic (domain routing, tenant onboarding) is built in v1.
- All store-specific data (name, logo, contact, theme, products) lives in the database and is loaded by a seed script. Nothing store-specific is hardcoded.
- Selling to another store = new Supabase project + new Vercel project + new seed file + new env vars.

## Development environment

- Supabase Cloud project (free tier) for development. Migrations live in `supabase/migrations` and are applied with the Supabase CLI.
- Service-role key stays server-side only and is never prefixed with `NEXT_PUBLIC_`.

## Decisions on spec gaps

1. **Arabic search.** Postgres full-text search has no Arabic stemmer. Use `pg_trgm` + `unaccent` over a normalized `search_text` column (unify alef forms, ta marbuta/ha, remove diacritics) and add a `search_aliases` field to products for Arabic/English aliases. The spec's schema does not include aliases yet.
2. **Images.** Supabase image transformations are not on the free plan. Compress and convert to WebP in the browser before upload, then serve through `next/image`.
3. **Offers.** The `offers` table is the single source of truth. A product's "on sale" state is derived from its active offer (inside start/end window), not stored on `products`.
4. **Badges.** Must be data-driven (spec A8) but the schema has no place for them. Add a `badges` representation (table or column) to the schema before building the product editor.

## Environment prerequisites

- Node.js LTS (24.x, installed via winget) and pnpm (installed with `npm install -g pnpm`; `corepack enable` fails without admin rights on Windows).
- Git repository initialized on branch `main`.
- Supabase CLI — installed through pnpm/npx when needed.
- A Supabase Cloud project and a Vercel account.
