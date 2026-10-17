---
name: write-tests
description: Write or fix jest + React Native Testing Library tests in tarodan-mobile following the repo's conventions (colocated __tests__, api module mocks, selector-aware store mocks, fake timers for delayed loading). Use when adding tests for a screen, hook, store or util.
argument-hint: "[file or folder under test]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git branch --show-current) Bash(pnpm test *) Bash(npx tsc --noEmit *) Bash(pnpm lint *)
---

# Write tests

Under test: `$ARGUMENTS`.

## Where

- Colocated: `<folder>/__tests__/<name>.test.ts(x)` (the expo-router patch keeps
  `__tests__` out of routes; Metro's blockList keeps it out of the bundle).
- Repo-wide guards live in `/__tests__` (e.g. `routerPrivateFolders`,
  `checkBranchName`). Shared helpers: `src/test-utils/`, `jest.setup.ts`.

## How

- Copy the closest existing test in the same folder for providers and mocks
  (QueryClient wrapper, i18n, safe area, router).
- Mock at the domain boundary: `jest.mock('@/lib/api', ...)` or the specific domain
  module, not axios. Assert on calls and rendered output, not on internals.
- zustand mocks accept a selector: `(sel) => (sel ? sel(state) : state)`, plus
  `getState` when the code calls it.
- Query keys come from `qk`; never assert on hand-written arrays.
- Delayed loading: advance fake timers by `theme.loading.delayMs` before expecting a
  skeleton; don't expect it immediately.
- Modals: assert the modal closes **before** the mutation resolves (iOS modal rule).
- Feedback: assert `toast` / `appAlert` / `confirm` from `@/ui` (mock them), never RN
  `Alert`.
- Money: pin exact amounts and the server-provided breakdown; never compute
  expected money in the test the same way the code does.
- Use `testID`s that exist on the component (`empty-state`, `error-state`, ...); add
  one if needed rather than querying by style.
- Write new test content in English.

## Run

```bash
pnpm test --maxWorkers=2 <the test files or folder>
```

Only the tests you touched or that cover the touched code; the full suite runs in CI.
Then `npx tsc --noEmit` and `pnpm lint` (tests are excluded from the design rules but
not from type checks).

## Flaky?

Never retry until green. Use the `flaky-triage` skill.
