# Backend requests

What the storefront needs from `../E-commerce-application-with-springboot`, most useful first. Each item names the
screen that is waiting and what it does meanwhile.

1. **Typed responses in OpenAPI.** Controllers return the generic envelope, so `schema.d.ts` has request types only
   and `src/api/types.ts` mirrors the Java records by hand. Annotate responses (or a generic `Response<T>` schema)
   so response types can be generated.
2. **Quote that marks unavailable lines** instead of answering 404 for the whole cart. Cart page: a guest cart
   re-quotes line by line to find and drop the archived product meanwhile.
3. **Back-in-stock alerts** (`POST /api/products/{slug}/restock-alerts`, SMS or email). Product page, sold-out box:
   shows "Save to wishlist" meanwhile.
4. **Several categories in one product query** (`category=figures,bags`). Listing "All products" with more than one
   category ticked: the storefront runs one query per category and merges them meanwhile.
5. **Returns** (`POST /api/orders/me/{orderNumber}/returns`). Orders: no "Return an item" button meanwhile.
6. **Promo codes** (roadmap 4.3). Checkout: the field says the code is not active.
7. **Gacha capsules** (roadmap 4.6). Home: practice turns only.
8. **Refresh token in an HttpOnly cookie.** It lives in `localStorage` today.
9. **Google sign-in.** Sign-in shows phone only.
