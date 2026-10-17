---
name: flaky-triage
description: Triage a flaky or intermittently failing jest or Maestro test in tarodan-mobile - reproduce, find the cause (timers, async leaks, shared state, ordering), fix it the same day or quarantine it with a backlog link. Use when a test passes and fails without code changes.
argument-hint: "[test file or flow]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git branch --show-current) Bash(pnpm test *)
---

# Flaky triage

Target: `$ARGUMENTS`. Policy (tarodan-ops `docs/test-strategy.md`): fix it **the same
day**, or quarantine it and add a backlog line with an owner. Never just retry until
green.

## 1. Reproduce

```bash
pnpm test --maxWorkers=2 <file>                          # a few times
pnpm test --maxWorkers=1 <file> --runInBand              # ordering / shared state?
pnpm test --maxWorkers=2 <file> --detectOpenHandles      # leaks, timers
git log --oneline -10 -- <file> <code under test>
```

Note whether it fails alone, only with its folder, or only in CI.

## 2. Usual causes here

- **Delayed loading**: skeletons appear only after `theme.loading.delayMs` (150) and
  stay `minVisibleMs` (300). Use fake timers and advance them; don't race real time.
- **Async without await**: missing `await waitFor(...)` / `findBy*`; React Query
  updates landing after the test ends ("worker failed to exit gracefully").
- **Shared state**: a QueryClient or zustand store reused across tests; create a
  fresh client per test, reset stores (`resetUserStores`), `jest.resetModules` when a
  module reads env at import.
- **Module-scope translation**: labels frozen at import time (see
  `src/i18n/CLAUDE.md` › Build labels at call time).
- **Date/time**: real `Date.now()` near day/timezone edges; pin with fake timers.
- **Maestro**: fixed sleeps, text selectors on translated copy, flows depending on
  another flow's state, seed data drift on staging.

## 3. Fix or quarantine

- Fix the cause in the test (or the code, if the flake exposes a real race) and run it
  repeatedly to confirm.
- Can't fix today: `it.skip(...)` with a comment linking the tarodan-ops `backlog.md`
  line (owner + date), and report it to the orchestrator.
- Commit with the `commit` skill (`test(<scope>): ...`).
