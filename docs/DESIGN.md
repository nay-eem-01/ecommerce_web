# Design: concept C, "night market"

The approved prototype (the "Senpai Supply Shop" artifact, nine views) is the specification. Its stylesheet is
`src/styles/index.css`, kept class for class; screens reuse its markup and classes. This page explains the system so
new screens fit without reopening the prototype.

## Principles

1. **Product first.** Every product view shows price, stock and delivery before the fold.
2. **Low friction.** Guest checkout, two checkout steps, cash on delivery first, phone-code sign-in without passwords.
3. **Honest.** Stock says "Only 4 left" only when it is true (the API sends `stockLeft` only while low). No fake
   urgency, no promises the backend does not keep.
4. **Spin it.** The 360 viewer is the signature: drag, swipe, arrow keys or auto-rotate.

## Tokens (`:root` in `src/styles/index.css`)

| Token | Use |
|---|---|
| `--night`, `--night-2..4` | page, panels, raised panels, viewer centre |
| `--text`, `--text-2`, `--muted` | primary, secondary, tertiary text |
| `--line`, `--line-2` | dividers, control borders |
| `--pink` (+ `--pink-deep`, `--glow`) | primary action, brand mark, neon sign, selected states |
| `--cyan` | prices, links, focus ring, info |
| `--ok`, `--warn`, `--bad` | in stock / delivered, low stock / stars, errors |
| `--r` 8px, `--r-sm` 4px | panel and control radii |
| `--wrap` 1240px | content width, 16px side gutters (safe-area aware) |

Tailwind utilities read the same tokens (`text-pink`, `bg-night-2`, `border-line`) for one-off layout. Dark only:
`color-scheme: dark`.

## Type

- **Dela Gothic One** (display): page titles, section titles, prices, the wordmark, category signs, the 新入荷 sign.
- **M PLUS 1p** (interface): everything else, 16px base, 400/500/700/800.
- Japanese glyphs are display-only; `src/styles/fonts-jp.css` holds the few Dela Gothic One slices that contain the
  current category labels (像 衣 水 鞄) and 新入荷. A new label with other characters falls back to the system font.
- The taka sign is written `৳ 6,800` (`tk()`), tabular figures for money and counts.

## Pages

| Route | Prototype view | Notes |
|---|---|---|
| `/` | Home | split hero with the featured figure and neon sign, perks, category tiles, new this week, gacha corner |
| `/shop`, `/shop/:category`, `/preorders` | Listing | filters (category on All products, in stock, price), sort, active-filter chips, mobile filter toggle |
| `/search?q=` | Search | big field, popular chips, highlighted matches, trending when empty |
| `/p/:slug` | Product | 360 viewer + views, sticky buy box, fact grid, option chips/swatches, quantity, sticky section tabs, description, story, specs and box, size guide, delivery, reviews, "Goes well with", mobile sticky buy bar |
| `/cart` | Cart | lines with stepper, remove, save for later; summary with free-delivery bar and trust list |
| `/checkout` | Checkout | 1 delivery, 2 payment; inline validation on blur, error summary on submit; order summary with promo |
| `/checkout/done`, `/checkout/result` | Confirmation | tick, order number, timeline, what to have ready; payment result and retry for online methods |
| `/sign-in` | Sign in | phone, then 6-digit code (auto-submits) |
| `/account`, `/account/orders`, `/account/wishlist`, `/account/addresses` | Profile | side nav with counts |
| `/orders/:orderNumber`, `/track`, `/help` | (new, same parts) | email links point to the first two; footer help links to the third |

## 360 viewer

`src/features/product/viewer/`. With `spinFrames` from the API it shows the photo nearest the angle (36 frames, one
every 10°, is the target). Without frames it draws the prototype's stand-in turntable render (`standIn.ts`), so the
demo catalog looks exactly like the prototype until real photos exist. Cards, tiles and cart thumbnails use
`thumbnailUrl` when set, else the same stand-in at a fixed angle.

## Deviations from the prototype

Each one keeps the layout and follows the honesty principle; the backend items are in `docs/BACKEND_REQUESTS.md`.

| Prototype | Build | Why |
|---|---|---|
| Sort "featured" and "newest" | "Newest", price both ways, name | the API has no featured order; two identical options would mislead |
| Sold out: "Notify me", "We will text you" | "Save to wishlist" | no back-in-stock alerts yet |
| "Continue with Google" | not shown | no Google sign-in on the backend |
| Prototype note "any 6 digits work" | code from SMS (development: backend log) | real OTP |
| Gacha: draws a prize that "ships with your next order" | same capsule and draw, labelled a practice turn | no gacha on the backend yet (roadmap 4.6) |
| Order actions "Call the rider", "Return an item" | "Track", "Cancel order" (while placed), "Write a review" (delivered) | no rider contact or returns API |
| Confirmation "sent the details by SMS" | "emailed the details" when an email was given | the backend sends email, not SMS |
| Photo thumbnails (Front, Back, Detail, In hand) as labelled slots | the product's real photos; only 360° when there are none | real data |
| "XL is sold out. Restock expected in 2 weeks." | "XL is sold out." | no restock dates in the API |
| Search, empty: "Trending this week" | "New this week" | the API has no popularity order; the list is the newest products |
| Photos that fail to load | the stand-in render | a card never shows a broken image |
| Pre-order: "Reserve for ৳ 1,000", "Pay ৳ 1,000 now, the rest on delivery" | "Reserve it", "arrives January 2027" | the deposit is informational today (backend PLAN §7 Q1); nothing is charged at reserve time with cash on delivery |
| Quantity up to 5 (pre-orders 3) | up to 10, or the stock left while low | the backend's per-item limit |
| Viewer `role=img` | `role=slider` with the angle as its value | it takes arrow keys, so screen readers should hear a control |
| Reviews: average and count | plus a 5-to-1 star distribution | the API sends it; it helps judge a small number of reviews |
| Sample reviews and sample orders | the shopper's real reviews and orders | real data |
