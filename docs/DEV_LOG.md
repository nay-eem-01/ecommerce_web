# Senpai Supply web - Development Log

Read this first at the start of every working session. Newest entry on top.
Plan and progress: `docs/ROADMAP.md`. Design: `docs/DESIGN.md`.

---

## Where we are

- Phase 2 on `feat/storefront-base`: 2.1 scaffold (`chore/storefront-scaffold`) 2.2 catalog pages
  (`feat/catalog-pages`), 2.3 product page (`feat/product-page`) 2.4 cart (`feat/cart`) and 2.5
  checkout (`feat/checkout`) done.

## Next up

1. 2.6 sign-in and account.

## Open items

- The repository is local only: create `senpai-supply_web` on GitHub and push the branches.
- `npm audit`: 3 moderate advisories in `openapi-typescript`'s dependencies (development tool only, not shipped).

---

## 2026-11-02: Checkout (step 2.5)

**Done**
- Checkout in two steps as the prototype: delivery (name, +88 phone, district from the API, area, address, optional
  email and rider note) and payment (only the methods the API enables). Fields validate on blur; submit lists what
  to fix with links that focus each field. The summary re-quotes for the chosen district.
- One `Idempotency-Key` per attempt, reused after a network error ("you will not be charged twice"), replaced after
  success. 409 (stock changed) re-quotes and explains.
- Cash orders go to the confirmation (order number, where the details went, real timeline, what to have ready, the
  account offer). Online orders go to the provider; `/checkout/result` reloads the order and offers "Try paying
  again" (`POST /api/orders/pay`) on failure.
- `/orders/:orderNumber` for members (timeline, items, totals, address, pay now, buy again, cancel while placed);
  `/track` for guests (the order email links to both); `/help` for the footer links.
- Members' saved default address prefills checkout; their address is saved on the first order.
- Checked against the running backend: a cash order to Gazipur (৳ 130 delivery) and a bKash order through the
  development fake provider, back to the result page as paid.

**Decisions**
- The order just placed is kept in `sessionStorage` (this tab only) so the confirmation survives a reload and a
  guest returning from a payment page can be matched to the phone tracking needs.

**Known limitations**
- A guest's payment result relies on the return URL's hint (`docs/BACKEND_REQUESTS.md` 3).

## 2026-11-02: Cart (step 2.4)

**Done**
- Cart page priced by `/api/checkout/quote` (Dhaka until checkout picks the district): lines with option, stock or
  pre-order month, stepper, remove, save for later (moves to the wishlist); summary with free-delivery progress,
  delivery fee, total and trust list. Checkout is blocked, with a reason on the line, when stock is short.
- Header badge counts items; cards get the wishlist heart and one-tap add for products without options.
- Members' archived lines are listed apart ("No longer available") and removed by item id. A guest cart holding an
  archived product (the quote answers 404) is re-quoted line by line and the stale line dropped, with a toast.

**Decisions**
- "In stock, ships today" became "In stock": the API does not promise same-day dispatch.

**Known limitations**
- Finding a stale guest line costs one quote per line (`docs/BACKEND_REQUESTS.md` 2).

## 2026-11-02: Product page (step 2.3)

**Done**
- 360 viewer: drag or swipe with inertia, arrow keys turn 10°, auto-rotate, degree read-out and track, a short spin
  on arrival (not with reduced motion). Plays `spinFrames` photos when the API has them (frame nearest the angle),
  else the stand-in render; a colour swatch recolours it without resetting the angle. Views row adds real photos.
- Buy box: maker, name, summary, price of the chosen option, saving, stock, the four-fact grid, option chips and
  swatches (sold-out ones disabled and named), quantity, add to cart / buy now / reserve, wishlist, delivery, payment
  methods and returns from the API.
- Sticky section tabs (highlight follows the scroll), description, story with quote and picture, specs and box, size
  guide, delivery and returns, reviews (summary, distribution, verified buyers, write and delete your own), "Goes
  well with", mobile sticky buy bar.
- Cart and wishlist stores (`features/cart/CartProvider.tsx`): guests in `localStorage` (validated on read), members
  on `/api/cart` and `/api/wishlist`; adding sets the server line to its new total.

**Decisions**
- Pre-orders say "Reserve it" and the arrival month, not a deposit amount (the backend's deposit is informational).
- Quantity follows the backend's limit (10) or the stock left while low.

**Known limitations**
- One size chart for every sized product (`lib/sizes.ts`), as in the prototype.

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
  each and merge (`docs/BACKEND_REQUESTS.md` 5).
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
