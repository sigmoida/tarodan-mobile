---
name: test-plan
description: Write a risk-based test plan for a tarodan-mobile change or feature - which levels (jest/RNTL, contract fixture, Maestro, device checklist), which critical paths, which existing tests to run. Use before implementing or reviewing anything touching payment, session, push, checkout or a new screen.
argument-hint: "[branch, PR or feature]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current)
---

# Test plan

Target: `$ARGUMENTS`. Strategy: tarodan-ops `docs/test-strategy.md` and
`qa/critical-paths.md`. There is no coverage percentage: every critical path needs
at least one test at the right level.

## 1. Understand the change

```bash
git log --oneline origin/development..HEAD
git diff --stat origin/development...HEAD
```

Read the acceptance criteria (product-owner / brief), the web behaviour at phone
width, and any contract delta involved.

## 2. Classify risk

| Area                                                       | Minimum                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Money / payment (checkout, PayTR, refunds, offers, trades) | behaviour-pinning jest test before and after; senior QA review                   |
| Session / auth / push                                      | jest + RNTL for hooks, screens and stores                                        |
| New or split screen                                        | screen test (states: loading, empty, error, data), hook tests                    |
| API contract change                                        | contract fixture test against `src/types`                                        |
| Native change                                              | device checklist on 1 iOS + 1 Android; Maestro critical flows on a staging build |
| Copy / i18n                                                | `src/i18n` tests                                                                 |

## 3. Write the plan

For each acceptance criterion and risk, list:

- **Level and file**: e.g. `app/checkout/__tests__/checkout-quote-error.test.tsx`
  (new), `maestro/flows/04-checkout-bypass.yaml` (existing).
- **Cases**: happy path, each error branch (4xx shown, 5xx/network retry), empty,
  guest vs signed-in, iOS vs Android differences, double tap / idempotency for
  mutations, modal-closes-before-mutation for dialogs.
- **What is mocked**: `@/lib/api` domain modules (not axios), zustand stores with a
  selector-aware mock `(sel) => (sel ? sel(state) : state)`.
- **Existing tests to run** (targeted, `--maxWorkers=2`).
- **Manual**: Metro flows, deep links (`xcrun simctl openurl booted "tarodan://..."`),
  device checklist items.
- **Sentry**: how a failure in the new flow is traceable (ids, no PII).

## 4. Output

A short markdown plan in the reply (not a file): table of criteria -> tests,
gaps found in current tests, and the exact commands:

```bash
pnpm test --maxWorkers=2 <paths>
pnpm maestro:dev <flow>
```

Update tarodan-ops `qa/critical-paths.md` (via the orchestrator) when a new critical
path appears.
