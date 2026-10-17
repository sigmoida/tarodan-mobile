# scripts/ci — release pipeline helpers

`release.sh` holds the shared logic of `.github/workflows/mobile-staging.yml` and
`mobile-production.yml`. The workflows only describe the flow; every decision lives
here (DRY). Process doc: `docs/RELEASE.md` (OTA detail: `docs/EAS_UPDATE_OTA.md`).

## Commands

The header of `release.sh` documents each subcommand; keep it current when you
change one:

- `profile-env`, `fingerprint <profile> <ios|android>`: the runtime fingerprint with
  the profile's env loaded from `eas.json` (equals the build's `runtimeVersion`).
- `build-state`, `last-store-version`, `version-gt`, `app-version`,
  `bump-version`: binary state per runtime (`available | pending | none`) and the
  version bookkeeping.
- `plan <staging|production>`: the single per-platform decision loop
  (`ota | build | wait | skip | blocked`). Production: a `development` merge (or an
  unknown source) is always a store build and never an OTA; `hotfix/*` follows the
  fingerprint. **VERSION-GATE**: a store build needs `expo.version` greater than the
  last finished production build, per platform.
- `recheck`, `await-binary`: re-query after taking the lock; a staging OTA waits
  for an in-flight build so the build doesn't miss it.
- `guard-ref`, `assert-app-id`, `build-submit`, `publish-ota`: ref guard (production
  only from `master`), package/bundle id checks, submit by build id (never
  `--latest`), OTA env validation, the Maestro/E2E hook ban in release builds.

## Rules

- Anything ambiguous (unknown CLI JSON, a build without visible submission) never
  counts as "binary available": the safe side is build or wait, never an OTA to a
  runtime without a binary.
- Keep it portable: macOS bash 3.2 and CI bash 5. Nested command substitutions use
  explicit `|| die` / `|| exit 1` because 3.2 lacks `inherit_errexit`.
- `eas update` does not read the `eas.json` profile env; `release.sh` loads it so the
  OTA fingerprint and `EXPO_PUBLIC_*` values match the build.
- Production steps stay behind the `production` / `production-build` GitHub
  Environments. The production freeze (tarodan-ops ADR 0010) blocks any production
  run until the user lifts it.
- Tags are `v<version>` today; the hub target is `mobile-v<version>` (backlog).

## Tests

- `src/config/__tests__/releaseScript.test.ts` runs `release.sh` against the fakes in
  `scripts/ci/__fakes__/` (`eas`, `npx`); `releaseWorkflow.test.ts` pins the
  workflow wiring. Change the fakes together with the script.
- Run: `pnpm test --maxWorkers=2 src/config/__tests__/releaseScript.test.ts
  src/config/__tests__/releaseWorkflow.test.ts`.
