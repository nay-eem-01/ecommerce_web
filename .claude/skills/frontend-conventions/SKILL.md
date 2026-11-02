---
name: frontend-conventions
description: React/TypeScript conventions for Senpai Supply web - folder layout, API access through TanStack Query hooks, the response envelope and ApiError, auth/token rules, money and stock display, the prototype stylesheet and tokens from docs/DESIGN.md, copy rules and tests. Use whenever writing or changing code in this repo.
---

# Frontend conventions (Senpai Supply web)

## Stack

Vite + React 19 + TypeScript (strict), React Router 7, TanStack Query 5, Tailwind 4 (theme + utilities only, no
preflight), the prototype's stylesheet (`src/styles/index.css`), self-hosted fonts (Fontsource), Vitest + Testing
Library, oxlint, Playwright.

## Layout

| Folder | Holds |
|---|---|
| `src/api/` | `client.ts` (fetch, envelope, refresh), `errors.ts`, `types.ts` (response types), one module per resource (`catalog.ts`, `cart.ts`, `orders.ts`, ...) exporting calls and Query hooks; `schema.d.ts` is generated |
| `src/ui/` | primitives with no data fetching: `Icon` (the prototype's sprite), `Toast`, `Stars`, `Stepper` |
| `src/layout/` | header, footer, app shell |
| `src/features/<area>/` | screens and their components (`home`, `catalog`, `product`, `cart`, `checkout`, `auth`, `account`, ...) |
| `src/lib/` | pure helpers (money, phone, dates, text) with unit tests next to them |

## API

- Every response is `{ status, message, payload, success, correlationId }`. `api<T>()` returns `payload` or throws
  `ApiError` (`status`, `message` - safe to show, `correlationId`, `payload` for details such as out-of-stock ids).
- Request types come from `Schemas[...]` (`types.ts` over `schema.d.ts`); response types are in `types.ts` and mirror
  the backend records. Regenerate the schema with `npm run gen:api` when the backend changes.
- Lists are the backend's `PageResponse`: `pageNo` (0-based), `pageSize` (<= 100), `sortBy`, `ascOrDesc`.
- Never compute a total in the browser: the cart and checkout show `/api/checkout/quote`.
- 401 -> one silent refresh, then sign-out. 404 for private things reads "not found". 409 shows the message and
  re-quotes. 429 shows the message and disables the button for a minute.

## Auth

Access token in memory; refresh token in `localStorage` (`senpai.refreshToken`) until the backend offers an HttpOnly
cookie. Each refresh token works once: refresh only through `refreshSession()` (one shared in-flight call). Never log
tokens or OTP codes.

## Rendering

Product text is plain text; split paragraphs with `paragraphs()` and render as text. No `dangerouslySetInnerHTML`.

## Styling

- Use the prototype's classes (`btn`, `panel`, `card`, `chip`, `field`, `input`, `pill`, `price`, ...) and its
  tokens (`var(--pink)`, or Tailwind `text-pink`, `bg-night-2`). No raw colours, no new palettes.
- Motion: only what the prototype has (hover glow, card zoom, capsule spin, viewer inertia, toast slide), all off
  under `prefers-reduced-motion` (handled in the stylesheet; JS-driven motion checks `matchMedia` too).
- Every interactive element has the cyan focus ring and a 44px target where the prototype has one.

## Copy

Sentence case, plain verbs, prices as `৳ 6,800` via `tk()`. Errors say what happened and what to do; empty states
invite the next action. Never promise what the backend does not do (no "we will text you" without an SMS).

## Tests

- Unit-test pure logic in `src/lib` and `src/api`.
- Screen tests with Testing Library, mocking `fetch` with `mockApi` (`src/test/api.ts`). Query by role and label.
- `npm test`, `npm run lint` and `npm run build` must all pass before a commit.
