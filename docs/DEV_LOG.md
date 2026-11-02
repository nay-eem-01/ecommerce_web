# Senpai Supply web - Development Log

Read this first at the start of every working session. Newest entry on top.
Plan and progress: `docs/ROADMAP.md`. Design: `docs/DESIGN.md`.

---

## Where we are

- Phase 2 on `feat/storefront-base`: 2.1 scaffold (`chore/storefront-scaffold`) done.

## Next up

1. 2.2 catalog pages.

## Open items

- The repository is local only: create `senpai-supply_web` on GitHub and push the branches.
- `npm audit`: 3 moderate advisories in `openapi-typescript`'s dependencies (development tool only, not shipped).

---

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
