---
name: mobile-release-prod
description: Production release of tarodan-mobile (development -> master release PR, or a hotfix/* OTA). User-invoked only; stops while the production freeze is active.
disable-model-invocation: true
argument-hint: "[release | hotfix <branch>]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current) Bash(git fetch origin *) Bash(scripts/ci/release.sh next-version *) Bash(scripts/ci/release.sh latest-release *)
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
git fetch origin --tags
git log --oneline origin/master..origin/development | head -50
git show origin/development:app.json | grep '"version"'
git log --oneline --no-merges origin/development..origin/master   # must be empty (merge back-merge PRs first)
scripts/ci/release.sh next-version origin/development   # the version this release gets
```

- CI green on `development`; `/code-review` important findings resolved.
- Release: `origin/development`'s `expo.version` equals `next-version` (or a higher
  manual version) and is greater than the last production build (VERSION-GATE). If
  not, make the release PR commit first, exactly as in `docs/RELEASE.md` › "Release
  version" (own worktree, `next-version`, `set-version`, `chore(release): <v>`),
  merge it into `development` (`merge-integration`, `--no-ff`), push with the user's
  approval and let staging build that version. The required CI check on the PR
  and the production `plan` refuse a release merge without it
  (`check-release-version`).
- Store notes (tr + en) exist in tarodan-ops `releases/store-notes/<version>.md`.
- tarodan-ops `qa/device-checklist.md` and the Maestro critical flows ran on the
  staging build.
- Ordering: any mobile fix the new API needs is already live; flags flip only after.

## 2a. Release (development -> master)

1. Ask the user to confirm, then open the PR (permission-gated):
   `gh pr create --base master --head development --title "release: mobile <version>"`.
2. The user merges with **"Create a merge commit"** (never squash or rebase) after
   CI + `Master source guard`. `mobile-production.yml` builds and submits both
   stores, then tags `mobile-v<version>` and writes the GitHub Release; App Store
   review is submitted by hand in App Store Connect; Play promotion beyond internal
   is manual.

## 2b. Hotfix (JS only -> production OTA)

1. `hotfix/<name>` is cut from `master`; the fix is reviewed.
2. PR `hotfix/<name>` -> `master` (user-confirmed). After merge, the OTA job waits for
   the user's approval in the `production` environment ("Review deployments").
3. A native hotfix needs a new version and a store build instead: before the PR,
   the version commit on the hotfix branch (`docs/RELEASE.md` › "Hotfix").
4. Merge the automatic back-merge PR into `development`.

## 3. After

- Report the run URLs, platforms built/OTA'd, and what still needs the user (review
  submission, environment approval, store promotion).
- Record compat changes in tarodan-ops `compat.md`.
