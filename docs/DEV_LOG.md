# Senpai Supply web - Development Log

Read this first at the start of every working session. Newest entry on top.
Plan and progress: `docs/ROADMAP.md`. Design: `docs/DESIGN.md`.

---

## Where we are

- Phase 2 (v1 storefront) is merged into `development`.
- **Phase 2v, the v2 design, is complete** on `feat/storefront-v2-base`: v2.1 `feat/v2-foundation` → v2.2
  `feat/v2-home` → v2.3 `feat/v2-listing` → v2.4 `feat/v2-product` → v2.5 `feat/v2-bag-checkout` → v2.6
  `feat/v2-account` → v2.7 `chore/v2-e2e-docs`, stacked, each one building, linting and passing its tests.
- It needs the backend's `feat/catalog-v2-base` (characters, facets, sets, early access, v2 demo catalog).
- **Phase 4 admin (4.1 to 4.4) is done** on `claude/ecstatic-wozniak-r0uwbi`, rebuilt on `feat/storefront-v2-base`,
  against the backend's insights API on its branch of the same name.

## Next up

1. **Nayeem:** merge the backend v2 PRs first, then PR the v2 steps in order into `feat/storefront-v2-base`, then the
   base into `development` (see the PR order in the session notes / below).
2. **Nayeem:** then PR the admin branch `claude/ecstatic-wozniak-r0uwbi` (it sits on `feat/storefront-v2-base`) and
   the backend's insights branch of the same name.
3. **Backend:** `docs/BACKEND_REQUESTS.md`, first the refresh-token grace window, then `stockLeft` on quote lines and
   the amount due on the order list.
4. Real product photos and 36-frame turntables replace the product art as they are shot.

## Open items

- `npm audit`: 3 moderate advisories in `openapi-typescript`'s dependencies (development tool only, not shipped).
- The e2e online-payment test follows the backend's `PAYMENT_RETURN_URL` (default port 5173): keep `npm run dev`
  running beside `npm run e2e`.

---

## 2026-11-04: Admin dashboard (Phase 4, steps 4.1 to 4.4)

**Done**
- `/admin/*` in its own lazy chunks and frame: staff sign-in (email + password), the first-time password change
  (the backend ends every session, so it signs in again), `RequireAdmin` (no ADMIN role: staff sign-in with "no staff
  access"; `mustChangePassword`: the password screen only). The backend checks every privilege regardless.
- Dashboard: 7/30/90 days or a range (in the URL, Dhaka days); eight totals against the previous period (a fall in
  cancellations shows as good); "What to act on" signals linking to the product row; revenue per day (one-series SVG
  bars, hover read-out, a table view); sales by category, character, district or payment; searches that found nothing
  and the most searched.
- Products: every active product with stock, days left, views, conversion, sold, revenue, saved and in-cart counts and
  its signals; sort by any column (`aria-sort`); exact stock editor per option (`GET /api/admin/products/{id}/stock`,
  added to the backend for this).
- Orders: list with status filter, number or phone search and paging; detail with items, totals, address, history
  and only the moves the state machine allows; cancel and return ask first; the backend's 409 message is shown.
- 19 screen and unit tests; `e2e/admin.spec.ts` (needs `E2E_ADMIN_PASSWORD`) places a cash order through the API,
  signs in as staff, opens the dashboard and products, and packs the order. All six Playwright tests pass against
  the backend on a fresh development database.

**Bugs found and fixed**
- Real data showed a 300% conversion (orders placed without a counted view); the backend now returns no rate when
  orders outnumber views.
- The password change lost its "sign in again" notice: React Router 7 navigates in a transition, so the guard saw the
  sign-out first. The sign-in page now ends the session state after arriving.
- A status move retried after its first attempt went through (lost response) showed the state machine's 409 although
  the order had moved; on 409 the order is reloaded and a move that already happened counts as done.
- `shop.spec.ts` sort check was flaky (read the cards before the re-sorted page arrived); it polls now.

**Known limitations**
- Admin screens are dark only, like the shop. No product create/edit form yet (4.5); use Swagger meanwhile.

## 2026-11-03: The v2 design on every screen (phase 2v)

**Done**
- v2.1 to v2.6 as in the roadmap: the canvas stylesheet verbatim, product art in place of photos, home, listings with
  the filter sheet (phone) and filter bar (desktop) in the URL, characters, sets, coming soon with early access,
  search with suggestions and recent searches, the product page with the 360 gallery and set offer, the bag drawer,
  focused checkout with the Inside/Outside Dhaka choice, the order-placed page, sign-in with six code boxes, and the
  account with tabs (phone) and side nav (desktop).
- v2.7: the Playwright tests rewritten for the v2 screens and catalog (bag drawer, `Place order · ৳ X`, code boxes,
  account order cards). All five pass against the backend's v2 branch on a fresh development database. 102 unit and
  screen tests pass.
- Each screen checked at 390 and 1440 px against the canvas on a real backend (screenshots), no sideways scroll.

**Bugs found and fixed on the way**
- `.d-only { display: revert }` broke the header grid; the breakpoint classes now hide with `display: none` only.
- The bag drawer rendered outside `.app` and lost the type styles; it renders inside now.
- The code boxes pulled focus back to the first box: moving focus ran the next box's guard against the value before
  React re-rendered. They keep the latest value in a ref (regression test in `account.test.tsx`).
- `.app p { font-weight: 400 }` out-ranked single classes (order number, `p.price`); bolded with `.app` selectors.

**Decisions**
- The bag's add-on swaps a part for its set (the set is its own product) rather than adding the other part.
- `/account` opens on the orders, as the design does; `/account/orders` redirects there; Details is a fourth tab.
- Deviations from the canvas are listed in `docs/DESIGN.md`.

---

## 2026-11-02: End-to-end tests (step 2.7)

**Done**
- Playwright (`npm run e2e`) against a running development backend, on its own Vite server (5174): guest browse,
  360 keys, colour and quantity, cart quote, cash checkout to Gazipur and tracking; search and URL filters; bKash
  through the fake provider back to the result page; sign-in with the logged SMS code (`E2E_APP_LOG`), cart and
  wishlist merge, member checkout, saved address, cancel; two tabs restoring one session together.
- All five pass against the backend on `feat/email-notifications`. 82 unit and screen tests pass.

**Bugs found and fixed**
- Opening two tabs at once signed the shopper out: both spent the same single-use refresh token and the backend
  revoked the session. Refreshes now run under a Web Lock and read the token inside it (`fix(api)` commit, unit test
  and the two-tab e2e test, which fails without the fix).

**Known limitations**
- A reload in the middle of a load's own session restore still signs out (the rotated token never reaches storage);
  needs the backend grace window (`docs/BACKEND_REQUESTS.md` 1).
- The e2e run places real orders; use a development database.

## 2026-11-02: Sign-in and account (step 2.6)

**Done**
- Sign-in: mobile number, then the 6-digit code (signs in as soon as 6 digits are typed); resend after the
  backend's cooldown with a countdown; the backend's messages for wrong codes and too many tries; "continue as a
  guest" when sign-in came from checkout. `?back=` only follows same-site paths.
- After sign-in the browser cart goes to `/api/cart/merge` and saved hearts to the account's wishlist, then the
  browser copies are cleared (kept if the merge fails).
- Account (signed-in only, with a redirect back after sign-in): overview (name, phone, edit details, sign out,
  latest order, picked for you), my orders (progress bar, buy again, track or cancel, write a review), wishlist,
  addresses (add, edit, remove, default).
- Checked against the running backend: code from the development SMS log, guest cart and heart merged, session kept
  across a reload, member checkout saved the address and named the account.

**Decisions**
- No name field at sign-in, as in the prototype; the account takes the name from the first order or "Add your name".

**Known limitations**
- "Picked for you" is the newest in-stock products; there is no recommendation API.

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
- A guest's payment result relies on the return URL's hint (`docs/BACKEND_REQUESTS.md` 4).

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
- Finding a stale guest line costs one quote per line (`docs/BACKEND_REQUESTS.md` 3).

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
  each and merge (`docs/BACKEND_REQUESTS.md` 6).
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
  responses as the generic envelope (`docs/BACKEND_REQUESTS.md` 2).
- The prototype's own icon sprite and toast instead of an icon library and Sonner, to match it exactly.
- Fonts: Dela Gothic One Latin plus only the Japanese slices holding the category signs, M PLUS 1p Latin. The
  stylesheet went from 780 KB to 39 KB.
- npm 10 failed with an arborist error (`edgesOut`); the lock file was made with npm 11.

**Known limitations**
- Refresh token in `localStorage` until the backend offers an HttpOnly cookie.
