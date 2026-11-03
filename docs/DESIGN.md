# Design: concept C v2, "night market"

The approved design is the **Senpai Supply v2** canvas (artifact `L57GTL2pBx7DhE9FVV2tH3`): nine phone screens and
nine desktop screens plus the desktop header and the product-art component. It keeps concept C's neon-pink Japanese
night-store look and makes it product-first, in the way of the big clothing shops: large pictures, two products per
row on phone, little chrome. Its stylesheet `ss.css` is pasted into `src/styles/index.css` verbatim; screens reuse its
markup and classes, and the additions below it are named per screen (`.home-*`, `.listing-*`, `.pd-*`, `.bag-*`,
`.co-*`, `.done-*`, `.si-*`, `.acct-*`, `.ocard-*`).

## Principles

1. **Product first.** Pictures lead; a card is image, name, price and one tag. Phone grids are two wide (one on
   request); desktop four (three on request).
2. **The identity in one look.** The hero says who we are (a drop, a neon sign, "Carry your character."); characters
   (Kitsune 狐, Ramen Cat 猫, Ronin 侍) are how people shop as much as categories are.
3. **Low friction.** Guest checkout, the bag as a drawer, two checkout steps, cash on delivery first, phone-code
   sign-in without a password.
4. **Honest.** "Only 4 left" only when true; prices, fees and totals only from the server's quote; no fake urgency.
5. **Spin it.** The 360 stays the signature of the product page.

## Tokens and type

Tokens are the canvas's `:root` (`--night`, `--night-2/3`, `--studio`, `--text`, `--text-2`, `--muted`, `--line`,
`--line-2`, `--pink`, `--on-pink`, `--glow`, `--cyan`, `--ok`, `--warn`, `--bad`). Tailwind reads them for one-off
layout. Dark only.

- **Dela Gothic One** (`--display`): titles, the wordmark, neon signs, big amounts.
- **M PLUS 1p** (`--body`): everything else.
- Japanese glyphs are display-only; `src/styles/fonts-jp.css` holds the Dela Gothic One slices for
  新学期 狐 猫 侍 雨 ありがとう おかえり 水 鞄 衣. A new sign with other characters falls back to the system font.
- The taka sign is written `৳ 1,450` (`tk()`), tabular figures for money.

## Layout

- Breakpoint **900px**: `.ph-only` below, `.d-only` from it (`-inline` variants for text).
- `.page`: 16px phone gutter, 40px desktop, 1440px max.
- `.pgrid`: 2 columns on phone (`.one` for one), 4 on desktop (`.three` for three).
- Phone product, account and checkout pages swap the menu for a back arrow; checkout has its own focused header and no
  footer; the phone sign-in and order-placed pages show only the wordmark.

## Pages

| Route | Design screen | Notes |
|---|---|---|
| `/` | Main / DesktopHome | drop hero (新学期), trust strip, category tiles with Apparel as coming soon, New in, characters, the set feature, school bags (phone), commute story |
| `/shop`, `/shop/:category`, `/characters/:character`, `/sets`, `/preorders` | Shop / DesktopShop | phone: character chips, "Filter and sort" sheet, 2/1 grid; desktop: filter bar of dropdowns (character, facet groups, price, in stock, sort, 3/4); the set card after the first row; "Showing X of Y" with Load more; filters in the URL |
| `/shop/apparel` (coming soon) | (home tile) | early-access page with "Get first access" |
| `/characters` | (home strip) | every character with its count |
| `/search?q=` | Search / DesktopSearch | suggestions from characters and categories, popular and recent searches, marked matches, "New this week" when empty |
| `/p/:slug` | Product / DesktopProduct | phone: one-at-a-time gallery (360 first), arrows, dots, thumbs, sticky add-to-bag bar; desktop: 360 across, four stills, sticky aside; buy box with swatches, quantity, heart, notes, facts, "Complete the set"; accordions; "You may also like" |
| bag drawer, `/cart` | Cart / DesktopCart | full screen on phone, 460px drawer on desktop; free-delivery bar, lines, one add-on (swap into a set, or reach free delivery), totals |
| `/checkout` | Checkout / DesktopCheckout | phone: collapsible summary, progress, sticky place-order; desktop: two numbered panels and a sticky summary; Inside/Outside Dhaka choice |
| `/checkout/done`, `/checkout/result` | Done / DesktopDone | ありがとう, progress (list on phone, bars on desktop), what to have ready, account offer, "Complete the school kit" |
| `/sign-in` | SignIn / DesktopSignIn | おかえり hero, phone then six code boxes (paste and SMS autofill fill all six); desktop split screen |
| `/account`, `/account/wishlist`, `/account/addresses`, `/account/details` | Account / DesktopAccount | phone tabs, desktop side nav; orders first: open orders with the four-bar progress, finished ones with Buy again and Write a review |
| `/orders/:orderNumber`, `/track`, `/help` | (no screen; same parts) | email links point to the first two |

## Product art

Until real photos exist, every picture is the canvas's product-art component, ported as `ProductArt`
(`src/features/art/`): a bottle, backpack, sling, tee or the backpack-and-bottle set, with the fox, cat, ronin or pins
print. `artFor()` picks it by product slug, then character, then category; a colour swatch recolours the body.
`ProductImage` shows the photo when the API has one and falls back to the art if it fails to load. On the product page,
`spinFrames` (36, one every 10°) drive the 360 when present; otherwise the art narrows and flips as it turns.

## Deviations from the design

| Design | Build | Why |
|---|---|---|
| Sample data (Nusrat's orders, review stars) | the shopper's real data | real data |
| Reviews link "★★★★★ Reviews" | the real average and count once there are reviews | honest |
| Bag add-on "Add the Kitsune backpack, set price with your bottle" | "Swap for the set and save ৳ X" (adds the set, takes one of the part out) | the set is its own product; adding the part alone would not get the set price |
| Bag add-on "Ronin sling bag" | the related product that reaches free delivery for the least | real data |
| Promo code "Apply" | says the code is not active | no promo codes yet (backend 4.3) |
| Payment "Card" | shown only when the backend enables it | methods come from `delivery-options` |
| Account "Have ready ৳ 2,410" | the order total ("Have ready" for cash, "Total" otherwise) | the order list has no amount due (backend request 5) |
| Bag stock "Only 4 left" | "Only a few left" | the quote has no stock count (backend request 4) |
| Account tabs: Orders, Wishlist, Addresses (phone) | plus Details | the desktop design has it; phones need it too |
| Sign-in "Close" goes home | the same | as designed |
| Desktop done sign 76px | 50px | 76px clips inside the hero at real copy lengths |
