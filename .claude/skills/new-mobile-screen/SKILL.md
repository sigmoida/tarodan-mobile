---
name: new-mobile-screen
description: Scaffold or split an expo-router screen in tarodan-mobile the house way (thin index.tsx, _hooks query/mutation hooks, _lib status/schema, _modals, PageShell/AppShell, qk keys, i18n, tests). Use when adding a new route or breaking up a large screen.
argument-hint: "[route path, e.g. app/settings/payouts]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current) Bash(npx tsc --noEmit *) Bash(pnpm lint *) Bash(pnpm test *)
---

# New mobile screen

Target route: `$ARGUMENTS`. Rules: `app/CLAUDE.md`, `src/ui/CLAUDE.md`,
`src/lib/query/CLAUDE.md`, `src/i18n/CLAUDE.md`.

## 0. Before writing code

1. Find the web counterpart in tarodan-app `apps/web` and look at it at phone width
   (< 640 px): sections, order, copy keys, states. Mobile copies it unless an ADR
   says otherwise.
2. Read the contract delta for every endpoint you will call (tarodan-ops
   `contracts/deltas/`, older ones in `docs/mobile-parity/`).
3. Pick the closest reference screen: `app/(tabs)/messages` (tab root),
   `app/settings/addresses` (list), `app/settings/edit-profile` (form), `app/offers/`
   (full pattern).

## 1. Shape

```
app/<group>/<route>/
  index.tsx          # < ~150 lines: hooks + sections + modals
  _lib/{types,schema,status}.ts
  _hooks/useXxx.ts, useDoXxx.ts
  _components/  _sections/  _modals/
  __tests__/
```

- Shared or reused code goes to `src/components/<feature>/` or `src/hooks/`.
- Never name a route file `_something.tsx` (the expo-router patch hides `_` paths).

## 2. Data

- Query keys: add to `src/lib/query/keys.ts` and use `qk.<domain>.*`; never inline.
- API calls: add to the domain module in `src/lib/api/` using `apiPath` for path
  variables; types from `src/types`.
- Reads: `useXxx` query hook. Writes: `useDoXxx` with `useAppMutation(fn, {
  invalidates, success, error })`. No `useState` + `useEffect` fetching.
- Call every hook before any early return.

## 3. UI

- Stack screen: `PageShell` with `loading` / `empty` / `error` + `onRetry`; modals and
  sheets go in `overlay`. Tab root: `AppShell` + `useTabBarInset()`.
- Content: `PageHeader`, `SectionCard`, `ProductGrid` / `ProductCard`, `EmptyState`
  (icon + title + subtitle), skeletons from `@/ui`. Tokens via `theme` from `@/ui`.
- Forms: `useZodForm` + `_lib/schema.ts`. A multi-field form is its own screen.
- Modals own their form + mutation and close **before** the mutation fires.
- Status colours/labels from `src/lib/shared`; prices via `formatPrice` /
  `ProductPrice`; no decorative icons.

## 4. Copy

Every string through `t()`. New keys: run the `add-i18n-key` skill (tr + en, web key
names, `node scripts/gen-keys.mjs`).

## 5. Tests and checks

- Add `__tests__/` for the screen and its hooks (RNTL; store mocks accept a selector).
  Payment, session and push screens need tests (tarodan-ops test strategy).
- Run, one at a time:

```bash
npx tsc --noEmit
pnpm lint
pnpm test --maxWorkers=2 app/<group>/<route> src/components/common/__tests__/screenShells.test.ts __tests__/routerPrivateFolders.test.ts
```

- Exercise it in Metro (`npx expo start --port 8081`; deep link with
  `xcrun simctl openurl booted "tarodan://<route>"`). Typed routes regenerate when
  Metro starts.
- Commit with the `commit` skill.
