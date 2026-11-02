# Senpai Supply web - Development Log

Read this first at the start of every working session. Newest entry on top.
Plan and progress: `docs/ROADMAP.md`. Design: `docs/DESIGN.md`.

---

## Where we are

- Phase 2 on `feat/storefront-base`: 2.1 scaffold (`chore/storefront-scaffold`) and 2.2 catalog pages
  (`feat/catalog-pages`) done.

## Next up

1. 2.3 product page.

## Open items

- The repository is local only: create `senpai-supply_web` on GitHub and push the branches.
- `npm audit`: 3 moderate advisories in `openapi-typescript`'s dependencies (development tool only, not shipped).

---

## 2026-11-02: Catalog pages (step 2.2)

**Done**
- The prototype's 360 stand-in renderer ported to TypeScript (`features/product/viewer/standIn.ts`): the demo
  products keep their exact look; other products take their category's; a colour swatch recolours the main part.
- Product card (flag, stock line, price, quick action), skeletons; a photo that fails to load falls back to the
  stand-in.
- Home: hero with the newest in-stock figure and the 新入荷 sign, perks (free-delivery threshold from the API),
  category tiles with their Japanese signs, new this week, gacha corner.
- Listings: all products, one category, pre-orders; filters (categories on All products, in stock, price) and sort
  in the URL; chips to remove a filter; mobile filter toggle; "Show more products".
- Search as you type (180 ms) with the query in the URL and the match marked.

**Decisions**
- Sorts are newest, price both ways and name (the API has no "featured"). Several ticked categories run one query
  each and merge (`docs/BACKEND_REQUESTS.md` 3).
- Gacha turns are practice draws until capsules are sold (roadmap 4.6).

**Known limitations**
- The stand-in render is drawn per card on the main thread (as in the prototype); fine for dozens of cards, revisit
  if a page shows hundreds.

## 2026-11-02: Scaffold (step 2.1)

**Done**
- Vite 8 + React 19 + TypeScript 5.9 + Tailwind 4 + React Router 7 + TanStack Query 5, Vitest, oxlint, the same
  layout and scripts as AgroTrends web. Dev proxy for `/api`; `vercel.json` with security headers.
- The prototype's stylesheet as `src/styles/index.css`, Tailwind theme and utilities over the same tokens (no
  preflight, so the prototype's base rules hold). Fonts self-hosted.
- API client: envelope, `ApiError` with `correlationId` and payload, access token in memory, refresh ahead of expiry
  and once on 401 through one shared in-flight call (single-use refresh tokens).
- Session provider (restore on load), header (wordmark, search, wishlist, account, cart, category row) and footer.

**Decisions**
- Request types are generated; response types are written in `src/api/types.ts` because the backend's OpenAPI types
  responses as the generic envelope (`docs/BACKEND_REQUESTS.md` 1).
- The prototype's own icon sprite and toast instead of an icon library and Sonner, to match it exactly.
- Fonts: Dela Gothic One Latin plus only the Japanese slices holding the category signs, M PLUS 1p Latin. The
  stylesheet went from 780 KB to 39 KB.
- npm 10 failed with an arborist error (`edgesOut`); the lock file was made with npm 11.

**Known limitations**
- Refresh token in `localStorage` until the backend offers an HttpOnly cookie.
