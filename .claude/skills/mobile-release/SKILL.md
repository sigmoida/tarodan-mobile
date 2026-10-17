---
name: mobile-release
description: Decide and explain how a tarodan-mobile change ships - fingerprint (OTA vs store build), staging flow, VERSION-GATE, OTA ordering against API deploys, freeze check. Read-only analysis plus the staging path; the production path is the user-only /mobile-release-prod skill.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current)
---

# Mobile release (analysis + staging)

Process docs: `docs/RELEASE.md`, `docs/EAS_UPDATE_OTA.md`, `scripts/ci/CLAUDE.md`,
tarodan-ops `docs/versioning.md`, `compat.md`. Never run `eas build`, `eas submit`,
`eas update` or `gh workflow run` yourself: they are permission-gated and the
pipeline does them.

## 1. Freeze check (always first)

```bash
sed -n '1,6p' ../tarodan-ops/decisions/0010-production-freeze.md
```

While the status is active: no master merge, no production OTA/build/submit, no
`production` environment approval. Staging is allowed; every push still needs the
user's approval.

## 2. OTA or store build? (fingerprint)

`runtimeVersion.policy` is `fingerprint`; an OTA only reaches binaries with the same
runtime. Compare the fingerprint of the base and the change (needs the profile env;
`release.sh` loads it from `eas.json`):

```bash
git diff --stat origin/development...HEAD
bash scripts/ci/release.sh fingerprint staging ios
bash scripts/ci/release.sh fingerprint staging android
```

Run the two `fingerprint` lines on the base commit and on HEAD (e.g. in a scratch
worktree) and compare. Different -> store build. Known inputs: native modules,
`app.json` / resolved `app.config.js` output (incl. `expo.version`), `eas.json`,
`plugins/`, autolinking, `package.json` scripts, `.gitignore`, icon/splash assets.
JS/TS, i18n and unreferenced images -> OTA. A fingerprint change belongs in its own
`build(native)` commit and its release note says a store build is required (run
tarodan-ops `qa/device-checklist.md` before the store build).

## 3. Staging (development)

- A push to `development` (user-approved) runs `mobile-staging.yml`: CI, then per
  platform OTA (runtime has a binary) or EAS build + submit (TestFlight / Play
  internal; Android only with `ANDROID_RELEASE_ENABLED`).
- A staging OTA waits for an in-flight build of the same runtime (`await-binary`);
  the daily build quota (`STAGING_MAX_BUILDS_PER_DAY`, default 2) can skip a build.
- `docs/**`, `*.md`, `maestro/**`, `.github/**` changes don't trigger a release.
- Ad-hoc APK: `mode=apk` on `mobile-staging.yml` (the user triggers it).

## 4. Production rules (for planning only)

- `development -> master` PR = a release = **always a store build**, never an OTA.
  **VERSION-GATE:** `app.json` `expo.version` must be greater than the last finished
  production build, per platform, or that platform is `blocked`.
- The version is computed at release time: `scripts/ci/release.sh next-version`
  (Conventional Commits since the highest `mobile-vX.Y.Z` tag: breaking -> major,
  `feat` -> minor, else patch), set by the release PR commit `chore(release): X.Y.Z`
  (`set-version`; a higher manual version wins). After a submitted store build
  `release-bookkeeping` tags `mobile-v<version>` and writes the GitHub Release; it
  never bumps `development` (`docs/RELEASE.md` › "Release version").
- A production OTA ships **only from a `hotfix/*` merge** into `master` (JS-only),
  after approval in the `production` GitHub Environment. "Submitted" is not
  "released": an OTA reaches only the runtime that is live.
- Executing any of this is `/mobile-release-prod` (user-invoked only).

## 5. Ordering against the API

- Deploy order: a needed mobile OTA first, then API, web and admin together from one
  tarodan-app release, then mobile store builds, flags last.
- A mobile JS fix that the new API needs ships as an OTA **before** the API deploy.
- Flags and admin settings flip only after the mobile version that supports them is
  live (e.g. `distance_sales_consent_required` stays off until mobile sends
  `distanceSalesAccepted`).
- An unavoidable API break: ship mobile, raise `min_supported_app_version_*`, deploy
  the API, record it in tarodan-ops `compat.md`.

## Output

Report: fingerprint changed or not (per platform), OTA vs build, the commits that
cause a build, freeze status, ordering constraints, and what the user must approve.
