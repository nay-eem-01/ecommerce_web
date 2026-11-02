---
name: git-workflow
description: Git and project-tracking conventions for Senpai Supply web - branch flow (phase base branch + serial step branches), small conventional commits authored as nay-eem-01, no attribution, what Claude may commit/push, and keeping docs/DEV_LOG.md and docs/ROADMAP.md current. Use at the start of every session and before any commit, branch or PR.
---

# Git workflow (Senpai Supply web)

Same flow as AgroTrends web and the backend repo.

## Branches

| Branch | Purpose |
|---|---|
| `development` | integration: finished phases land here first (default branch) |
| `staging` | pre-production, promoted from `development` |
| `production` | what is live |

1. Each roadmap phase has a base branch from `development`: `feat/<phase>-base` (e.g. `feat/storefront-base`).
2. Each step is its own branch taken from the **previous step's branch** (the first from the base), so stacked PRs
   never conflict: `feat/<step>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`, `test/<topic>`.
3. Step PRs go **serially into the phase base**; merge commits, not squash.
4. When the phase is done the base PRs into `development`; then `development` -> `staging` -> `production`.

## Commits

- Conventional prefixes with an optional scope (the feature folder): `feat(product): ...`, `fix(cart): ...`,
  `docs: ...`, `test(e2e): ...`, `chore: ...`. Imperative subject <= 72 chars; the body says why when it isn't obvious.
- One coherent change per commit that builds, lints and passes tests.
- Author and committer are **nay-eem-01** (`110116452+nay-eem-01@users.noreply.github.com`); set it in a fresh
  clone or cloud session. **No `Co-Authored-By` and no AI attribution** in commits or PRs.
- Never commit `.env`, tokens or build output.

## Before every push

```bash
npm run lint && npm test && npm run build
```

For changes to checkout, cart or sign-in, also run `npm run e2e` against the backend.

## What Claude may do

- Commit and push finished steps; give the branches in PR order. Nayeem opens and merges PRs.
- Never force-push, `reset --hard`, rewrite published history or delete branches without being told to.

## Docs in the same PR as the step

Tick the step in `docs/ROADMAP.md` (and the progress count) and add a dated entry, newest first, to
`docs/DEV_LOG.md`: **Done**, **Decisions**, **Known limitations**; refresh "Where we are", "Next up", "Open items".
