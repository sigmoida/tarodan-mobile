# scripts/ci — release pipeline helpers

`release.sh` holds the shared logic of `.github/workflows/mobile-staging.yml` and
`mobile-production.yml`. The workflows only describe the flow; every decision lives
here (DRY). Process doc: `docs/RELEASE.md` (OTA detail: `docs/EAS_UPDATE_OTA.md`).

## Commands

The header of `release.sh` documents each subcommand; keep it current when you
change one:

- `profile-env`, `fingerprint <profile> <ios|android>`: the runtime fingerprint with
  the profile's env loaded from `eas.json` (equals the build's `runtimeVersion`).
- `build-state`, `last-store-version`, `version-gt`, `app-version`: binary state per
  runtime (`available | pending | none`) and the version reads.
- `latest-release [below]`, `next-version [ref]`, `set-version <X.Y.Z>`: release
  versioning. The version is computed at release time from the Conventional Commits
  since the highest `mobile-vX.Y.Z` tag (breaking -> major, `feat` -> minor, else
  patch; `chore(release)` and merge commits ignored); a higher version already in
  `app.json` wins (manual override). The tag is looked up repo-wide, not "reachable
  from ref": release tags sit on master merge commits that development never
  contains. No tag -> `next-version` fails (no guessed fallback). The release PR
  flow: `docs/RELEASE.md` › "Release version".
- `check-release-version`: release gate (`mode=auto`, source not `hotfix/*`):
  `expo.version` must equal `next-version`. Runs in `ci.yml` on PRs into master
  (merge ref, required check) and in the production `plan` after the merge.
  Skipping hotfixes by branch name is safe only because `Master source guard`
  (`master-flow.yml`, required) admits a `hotfix/*` head only when its merge base
  with `development` is already on master (two read-only `gh api .../compare`
  calls, no checkout): a hotfix cut from development fails there.
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
- `publish-ota` runs `eas update --environment <the profile's EAS environment>` so
  EAS variables such as `EXPO_PUBLIC_SENTRY_DSN` reach the bundle, then uploads the
  source maps (`npx sentry-expo-upload-sourcemaps dist`, `SENTRY_AUTH_TOKEN`;
  required on production, a warning elsewhere). With `--environment`, EAS values
  **override** the shell (unlike `eas build`, where `eas.json` wins), so it first
  stops (fail closed) on an EAS variable that repeats an `eas.json` profile key, any
  `EXPO_PUBLIC_MAESTRO*` variable, or on production a DSN that is missing, empty or
  not readable by `eas update` (`secret` visibility; use plain text or sensitive).
  Before publishing it also checks the upload target the way the upload script
  resolves it (the `@sentry/react-native/expo` plugin options, or `SENTRY_ORG` +
  `SENTRY_PROJECT` + `SENTRY_URL`) and that `@sentry/react-native`'s
  `scripts/has-sourcemap-debugid.js` is installed; after publishing it requires a
  source map per platform in `dist/`, each with a `debugId` (Sentry matches bundle
  and map by it; a map without one uploads but never resolves). A failure after
  publishing says so: do not re-run (that publishes a second update).

## Rules

- Anything ambiguous (unknown CLI JSON, a build without visible submission) never
  counts as "binary available": the safe side is build or wait, never an OTA to a
  runtime without a binary.
- Keep it portable: macOS bash 3.2 and CI bash 5. Nested command substitutions use
  explicit `|| die` / `|| exit 1` because 3.2 lacks `inherit_errexit`.
- `eas update` does not read the `eas.json` profile env; `release.sh` loads it so the
  OTA fingerprint and `EXPO_PUBLIC_*` values match the build.
- Production steps stay behind the `production` / `production-build` GitHub
  Environments. The production freeze (tarodan-ops ADR 0010) was lifted on
  2026-10-17; every production run still needs the user's approval.
- Tags are `mobile-v<version>` (`TAG_PREFIX` in `release.sh`), set by
  `release-bookkeeping` in `mobile-production.yml` on the released master commit. CI
  never writes to `development` (no post-release bump).

## Tests

- `src/config/__tests__/releaseScript.test.ts` runs `release.sh` against the fakes in
  `scripts/ci/__fakes__/` (`eas`, `npx`), and runs the `run:` scripts of the
  release-bookkeeping and `Master source guard` steps with a fake `gh`;
  `releaseWorkflow.test.ts` pins the workflow wiring. Change the fakes together with
  the script.
- Run:

  ```bash
  pnpm test --maxWorkers=2 src/config/__tests__/releaseScript.test.ts src/config/__tests__/releaseWorkflow.test.ts
  ```
