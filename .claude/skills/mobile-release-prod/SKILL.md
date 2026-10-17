---
name: mobile-release-prod
description: Production release of tarodan-mobile (development -> master release PR, or a hotfix/* OTA). User-invoked only; stops while the production freeze is active.
disable-model-invocation: true
argument-hint: "[release | hotfix <branch>]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current)
---

# Mobile production release (user only)

Mode: `$ARGUMENTS`. Read `docs/RELEASE.md` (Production, Hotfix) and the
`mobile-release` skill first. Every step that writes to production needs the user's
explicit go in this conversation; GitHub's `production` environment approval stays
with the user.

## 0. Freeze gate (stop here if active)

```bash
sed -n '1,6p' ../tarodan-ops/decisions/0010-production-freeze.md
```

If the status is not `lifted` or `superseded`, **stop** and tell the user the freeze
(ADR 0010) is active. Nothing below runs.

## 1. Preconditions

```bash
git fetch origin
git log --oneline origin/master..origin/development | head -50
node -p "require('./app.json').expo.version"
```

- CI green on `development`; `/code-review` important findings resolved.
- Release: `expo.version` is greater than the last production build (VERSION-GATE).
  If not, bump it on `development` first (`chore(release): ...`, a fingerprint
  change -> its own commit).
- Store notes (tr + en) exist in tarodan-ops `releases/store-notes/<version>.md`.
- tarodan-ops `qa/device-checklist.md` and the Maestro critical flows ran on the
  staging build.
- Ordering: any mobile fix the new API needs is already live; flags flip only after.

## 2a. Release (development -> master)

1. Ask the user to confirm, then open the PR (permission-gated):
   `gh pr create --base master --head development --title "release: mobile <version>"`.
2. The user merges after CI + `Master source guard`. `mobile-production.yml` builds
   and submits both stores; App Store review is submitted by hand in App Store
   Connect; Play promotion beyond internal is manual.

## 2b. Hotfix (JS only -> production OTA)

1. `hotfix/<name>` is cut from `master`; the fix is reviewed.
2. PR `hotfix/<name>` -> `master` (user-confirmed). After merge, the OTA job waits for
   the user's approval in the `production` environment ("Review deployments").
3. A native hotfix needs a version bump and a store build instead.
4. Merge the automatic back-merge PR into `development`.

## 3. After

- Report the run URLs, platforms built/OTA'd, and what still needs the user (review
  submission, environment approval, store promotion).
- Record compat changes in tarodan-ops `compat.md`.
