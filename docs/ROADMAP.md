# Senpai Supply web - Roadmap

The storefront's plan and progress. It is Phase 2 of the backend's roadmap
(`../E-commerce-application-with-springboot/docs/ROADMAP.md`); design in `docs/DESIGN.md`, log in `docs/DEV_LOG.md`.
Update this file in the same PR that finishes a step.

Each step is **one small PR**. Steps of a phase are stacked: each step branch is taken from the previous one and PRs
into the phase's base branch (see `.claude/skills/git-workflow`).

**Legend:** ✅ done · 🔄 in progress · ⬜ not started

**Progress:** 2 of 7 steps done

## Phase 2 - Storefront (`feat/storefront-base`)

| # | Step | Branch | Status |
|---|---|---|---|
| 2.1 | Scaffold (Vite, React 19, TypeScript, Tailwind 4, Router, Query, Vitest, oxlint), the prototype stylesheet and fonts, API client with single-flight refresh, session, header and footer, docs | `chore/storefront-scaffold` | ✅ |
| 2.2 | Home, category lists with filters and sort, search; product card; 360 stand-in renderer | `feat/catalog-pages` | ✅ |
| 2.3 | Product page: 360 viewer, buy box, options, section tabs, story, specs, size guide, delivery, reviews, related, sticky buy bar | `feat/product-page` | ⬜ |
| 2.4 | Cart (guest in the browser, member on the server) priced by the quote; wishlist hearts; save for later | `feat/cart` | ⬜ |
| 2.5 | Checkout with Idempotency-Key, confirmation, payment redirect and result, retry payment, order page, guest tracking, help | `feat/checkout` | ⬜ |
| 2.6 | Phone-code sign-in with cart and wishlist merge; account: overview, orders, wishlist, addresses | `feat/account` | ⬜ |
| 2.7 | Playwright end-to-end: browse, cart, checkout, track, sign in | `test/e2e` | ⬜ |
