# Backend requests

What the storefront needs from `../E-commerce-application-with-springboot`, most useful first. Each item names the
screen that is waiting and what it does meanwhile.

1. **A short grace window for refresh-token reuse** (e.g. the token rotated in the last 30 seconds may be sent once
   more by the same session and gets a fresh pair, instead of revoking the session). Every page load spends the
   refresh token; if the shopper reloads or leaves while that request is in flight, the rotated token never reaches
   storage and the next visit is signed out as "theft". The storefront already serialises refreshes across tabs
   (Web Lock), which fixes two tabs opening together; only the backend can fix the interrupted load.
2. **Typed responses in OpenAPI.** Controllers return the generic envelope, so `schema.d.ts` has request types only
   and `src/api/types.ts` mirrors the Java records by hand. Annotate responses (or a generic `Response<T>` schema)
   so response types can be generated.
3. **Quote that marks unavailable lines** instead of answering 404 for the whole cart. Cart page: a guest cart
   re-quotes line by line to find and drop the archived product meanwhile.
4. **Payment status in guest tracking** (`TrackingResponse.paymentStatus`). Payment result page: for a guest it trusts
   the `payment` hint in the return URL meanwhile (members' orders carry the real status).
5. **Back-in-stock alerts** (`POST /api/products/{slug}/restock-alerts`, SMS or email). Product page, sold-out box:
   shows "Save to wishlist" meanwhile.
6. **Several categories in one product query** (`category=figures,bags`). Listing "All products" with more than one
   category ticked: the storefront runs one query per category and merges them meanwhile.
7. **Returns** (`POST /api/orders/me/{orderNumber}/returns`). Orders: no "Return an item" button meanwhile.
8. **Promo codes** (roadmap 4.3). Checkout: the field says the code is not active.
9. **Gacha capsules** (roadmap 4.6). Home: practice turns only.
10. **Refresh token in an HttpOnly cookie.** It lives in `localStorage` today.
11. **Google sign-in.** Sign-in shows phone only.
