# EWS: a digital storefront for local electronics shops

A fast, bilingual (Arabic RTL / English) product catalogue that the shop owner runs alone: products, offers, homepage, pictures, reviews, statistics. Customers browse, compare and message the shop on WhatsApp; there is no cart and no customer login.

Built with Next.js 16, Supabase and Cloudflare Workers. One deployment serves one store.

## Documentation

| For | File |
|---|---|
| The shop owner (Arabic) | [`docs/owner-guide.ar.md`](docs/owner-guide.ar.md), printable: [`docs/owner-guide.ar.pdf`](docs/owner-guide.ar.pdf) (`pnpm docs:pdf` rebuilds it after the guide changes) |
| Handing the project over to a shop (Arabic) | [`docs/handover-checklist.ar.md`](docs/handover-checklist.ar.md) |
| The next developer | [`docs/developer-handover.md`](docs/developer-handover.md) |
| Technology choices and why | [`TECH_STACK.md`](TECH_STACK.md) |
| What the product must do | [`electronics_store_full_agent_spec.md`](electronics_store_full_agent_spec.md) |

## Author

Designed and built by **Dia'a Yaqub Arar** (ضياء يعقوب عرار)

- Email: [diaararx@gmail.com](mailto:diaararx@gmail.com)
- Phone / WhatsApp: +972 56 820 7267
- GitHub: [github.com/dia-312](https://github.com/dia-312)

© 2026 Dia'a Yaqub Arar. Proprietary: see [`LICENSE`](LICENSE). The one shop it is delivered to may run it for its own store; selling it, using it for another store, or reusing the code elsewhere is not allowed. The credit line in the site footer stays.

## Quick start

```bash
pnpm install
cp .env.example .env.local     # add a Supabase project's URL and anon key, and STORE_SLUG
pnpm dev                       # http://localhost:3000  (redirects to /ar)
```

```bash
pnpm lint && pnpm typecheck && pnpm test    # checks
pnpm test:e2e                               # browser tests (need a local Supabase, see the developer handover)
```

Deploys happen by pushing to `main` (Cloudflare Workers Builds). Database changes are `supabase db push`. Details in the developer handover.
