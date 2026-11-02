# Senpai Supply web

The storefront of Senpai Supply: anime figures, cosplay, bottles and bags for shoppers in Bangladesh. Guest
checkout with cash on delivery, phone-code sign-in, a product page built around a 360 viewer. The design is
concept C, "night market" (`docs/DESIGN.md`). The API is the Spring Boot backend in
`../E-commerce-application-with-springboot` (contract: its `docs/API.md`; Swagger at
`http://localhost:8080/swagger-ui.html`).

## Start of every session

1. Read `docs/DEV_LOG.md` (where we are / next up / open items) and `docs/ROADMAP.md`.
2. `git status` and check the branch. Follow `.claude/skills/git-workflow`.

## Where things are

- `docs/ROADMAP.md` - phased steps, one small PR each, with status
- `docs/DEV_LOG.md` - dated log of what was done and decided
- `docs/DESIGN.md` - the approved design, tokens, layout and rules; follow it for every screen
- `docs/BACKEND_REQUESTS.md` - what the storefront needs from the backend next
- `.claude/skills/` - `frontend-conventions`, `git-workflow`
- `src/api/schema.d.ts` - request types generated from the backend's OpenAPI (`npm run gen:api`, backend
  running); never hand-edit. Response types are in `src/api/types.ts`.

## Run and test

```bash
npm install
npm run dev        # http://localhost:5173; /api is proxied to the backend on :8080
npm test           # Vitest + Testing Library
npm run lint       # oxlint (warnings fail too)
npm run build      # type-check + production build
npm run e2e        # Playwright against a running backend (development profile); see playwright.config.ts
```

## Rules that matter most

- Prices, delivery fees and totals come from the server (`/api/checkout/quote`); the browser never computes a total.
- The shopper's identity comes from the token; never send a user id in a URL or body.
- The access token lives in memory only; never log tokens or OTP codes.
- Product text is plain text with blank-line paragraphs; render it as text. No `dangerouslySetInnerHTML`.
- Data fetching goes through TanStack Query hooks in `src/api/`; components never call `fetch` directly.
- Every checkout attempt sends one `Idempotency-Key`, reused on retry.
- Every step ships with tests for its logic and its main screen; update `docs/ROADMAP.md` and `docs/DEV_LOG.md` in
  the same PR.
- Branch flow: `development` -> phase base -> serial step PRs -> base into `development`. Small conventional
  commits authored as nay-eem-01, no attribution.
