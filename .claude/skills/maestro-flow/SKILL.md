---
name: maestro-flow
description: Write, update or run a Maestro E2E flow in tarodan-mobile (maestro/flows, subflows, tags, testID selectors, pnpm maestro:dev). Use when a critical path needs device-level coverage or before a store build.
argument-hint: "[flow file or feature]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git branch --show-current)
---

# Maestro flow

Target: `$ARGUMENTS`. Reference: `maestro/README.md` (setup, tags, selectors, auto-login,
EAS `maestro` profile). Flows run against a **dev or staging build**, not Expo Go.

## Layout

- `maestro/flows/*.yaml` (52 flows; prefixes `01-`, `D-` diagnostics, `E-` coverage,
  `F-` multi-step regression), `maestro/subflows/*.yaml` (`open-tarodan`, `login-as`,
  `logout`, `pass-identity-gate`, ...), `maestro/run.sh` (harness), `maestro/app-id.sh`.
- Tags: `smoke` (cloud CI runs these), `regression`, `manual`.

## Writing a flow

```yaml
# F-xx: <what it proves>
appId: ${APP_ID}
tags:
  - regression
env:
  EMAIL: zeynep@demo.com
  PASSWORD: Demo123!
---
- runFlow: ../subflows/open-tarodan.yaml
- tapOn:
    id: "tab-profile"
- extendedWaitUntil:
    visible:
      id: "profile-edit-button"
    timeout: 15000
- assertNotVisible: ".*Network Error.*"
```

- Always `appId: ${APP_ID}`; reuse subflows instead of copying steps.
- Prefer `id:` selectors (`testID`). If the element has none, add a `testID` in the
  component (same change) instead of matching translated text.
- Each flow is independent (no state from another flow); log out / in via subflows.
- Wait with `extendedWaitUntil`, then assert. No fixed sleeps.
- Never put real credentials in a flow: demo seed users only (public repo).

## Running

```bash
pnpm maestro:dev flows/<flow>.yaml                          # local dev client
MAESTRO_TARGET=staging pnpm maestro:dev flows/<flow>.yaml   # staging (maestro profile) build
```

The harness checks the backend, a booted simulator and Metro with
`EXPO_PUBLIC_MAESTRO=1` (auto-login test hook). Release builds must never carry
`EXPO_PUBLIC_MAESTRO*` (`release.sh` refuses to build them).

## Before a store build

Run the `smoke` flows and the critical-path flows listed in tarodan-ops
`qa/critical-paths.md` on the staging build, and record the result in the device
checklist. A failing flow blocks the store build until it is fixed or explicitly
waived by the user.
