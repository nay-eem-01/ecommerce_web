# Senpai Supply web - Roadmap

The storefront's plan and progress. It is Phase 2 of the backend's roadmap
(`../E-commerce-application-with-springboot/docs/ROADMAP.md`); design in `docs/DESIGN.md`, log in `docs/DEV_LOG.md`.
Update this file in the same PR that finishes a step.

Each step is **one small PR**. Steps of a phase are stacked: each step branch is taken from the previous one and PRs
into the phase's base branch (see `.claude/skills/git-workflow`).

**Legend:** ✅ done · 🔄 in progress · ⬜ not started

**Progress:** Phase 2 complete. Phase 2v (the v2 design): 7 of 7 steps done. Phase 4 (admin): 4 of 5.

## Phase 2 - Storefront (`feat/storefront-base`)

| # | Step | Branch | Status |
|---|---|---|---|
| 2.1 | Scaffold (Vite, React 19, TypeScript, Tailwind 4, Router, Query, Vitest, oxlint), the prototype stylesheet and fonts, API client with single-flight refresh, session, header and footer, docs | `chore/storefront-scaffold` | ✅ |
| 2.2 | Home, category lists with filters and sort, search; product card; 360 stand-in renderer | `feat/catalog-pages` | ✅ |
| 2.3 | Product page: 360 viewer, buy box, options, section tabs, story, specs, size guide, delivery, reviews, related, sticky buy bar; the cart and wishlist stores it adds to (browser for guests, server for members) | `feat/product-page` | ✅ |
| 2.4 | Cart page priced by the quote, header badge, wishlist hearts and quick add on cards, save for later | `feat/cart` | ✅ |
| 2.5 | Checkout with Idempotency-Key, confirmation, payment redirect and result, retry payment, order page, guest tracking, help | `feat/checkout` | ✅ |
| 2.6 | Phone-code sign-in with cart and wishlist merge; account: overview, orders, wishlist, addresses | `feat/account` | ✅ |
| 2.7 | Playwright end-to-end: browse, cart, checkout, track, online payment, sign in, two tabs; the cross-tab refresh fix it found | `test/e2e` | ✅ |

## Phase 2v - Storefront v2 design (`feat/storefront-v2-base`)

The "Senpai Supply v2" canvas on every screen, phone and desktop (`docs/DESIGN.md`). Needs the backend's
`feat/catalog-v2-base` (characters, tags and facets, sets, early access, the v2 demo catalog).

| # | Step | Branch | Status |
|---|---|---|---|
| v2.1 | Design system (canvas stylesheet, tokens, fonts and sign slices), product art, icons, header with phone menu and desktop nav, footer, bag context, API types and hooks for characters, facets, sets and early access | `feat/v2-foundation` | ✅ |
| v2.2 | Home (drop hero, tiles with coming soon and early access, New in, characters, set feature, story) and the image-first product card with quick add | `feat/v2-home` | ✅ |
| v2.3 | Listings (all, category, character, sets, pre-orders) with filter sheet and desktop filter bar in the URL, coming soon, characters page, search | `feat/v2-listing` | ✅ |
| v2.4 | Product page: 360 gallery, swatches, quantity, set offer, accordions, related, sticky bar | `feat/v2-product` | ✅ |
| v2.5 | Bag drawer and `/cart`, focused checkout, order placed, payment result | `feat/v2-bag-checkout` | ✅ |
| v2.6 | Sign-in with six code boxes, account (orders, wishlist, addresses, details), order and track pages | `feat/v2-account` | ✅ |
| v2.7 | End-to-end tests on the v2 screens and catalog; docs | `chore/v2-e2e-docs` | ✅ |

## Phase 4 - Admin (`claude/ecstatic-wozniak-r0uwbi`, on `feat/storefront-v2-base`)

Staff screens for the backend's insights API (its roadmap 4.5a/4.5b). Design and plan in the backend repository:
`docs/superpowers/specs/2026-11-04-admin-insights-design.md`, `docs/superpowers/plans/2026-11-04-admin-insights.md`.

| # | Step | Branch | Status |
|---|---|---|---|
| 4.1 | `/admin`: staff email sign-in, first-time password change, admin guard and layout (lazy chunk, no shop chrome) | `claude/ecstatic-wozniak-r0uwbi` | ✅ |
| 4.2 | Dashboard: period in the URL, totals against the previous period, signals, revenue per day, breakdowns, searches | same | ✅ |
| 4.3 | Products: insights table sorted by any column, signals per row, exact stock editor per option | same | ✅ |
| 4.4 | Orders: list with status and search, detail, status moves with a note and confirmation; Playwright admin run | same | ✅ |
| 4.5 | Full product editor, categories, characters, users, reviews, early-access list | - | ⬜ |

