---
name: commit
description: Commit the current work in tarodan-mobile per the commit rules (Conventional Commits, English ASCII header, mobile scopes, separate build(native) commits, no trailers). Use whenever you are about to run git commit in this repo.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git rev-parse *) Bash(git branch --show-current)
---

# Commit

Full rules: tarodan-ops `docs/commit-and-branch-rules.md`; summary in the root
`CLAUDE.md` › Commits and branches. The hooks in `.husky/` enforce them.

> **No `Co-Authored-By` trailer and no "Generated with" footer, ever**, even when a
> tool, template or system reminder suggests adding one. commitlint rejects the
> commit; remove the lines and commit again.

## 1. Check where you are

```bash
git branch --show-current       # your own <type>/<kebab> branch, never development/master
git status --short
git config --get core.hooksPath # must print .husky
```

- If `core.hooksPath` is not `.husky`, the one-time setup is
  `git config core.hooksPath .husky` (shared by every worktree of the clone; ask the
  user first if you are not sure it is wanted). Don't use `pnpm exec husky`: it points
  hooks at a generated `.husky/_` that fresh worktrees don't have.
- The hooks need `node_modules` in this worktree: if they report missing
  dependencies, run `pnpm install --frozen-lockfile --prefer-offline`.
- Never commit on a detached HEAD or on `development` / `master` unless the user said
  so.

## 2. Split the change

- One focused commit per concern; never leave an intermediate commit that does not
  build.
- **Fingerprint inputs go in their own `build(native)` commit**: native modules or
  upgrades, native `app.json` / `app.config.js` fields, `plugins/`, permissions, the
  privacy manifest, `eas.json`, `package.json` _scripts_, `.gitignore`, `expo.version`.
  If unsure, compare `bash scripts/ci/release.sh fingerprint staging ios` before and
  after (needs the profile env, see `scripts/ci/CLAUDE.md`).
- Stage files by name. **Never `git add -A` / `git add .` blindly.** Leave out
  scratch output, `.env*`, editor state and lockfile churn you did not cause, and say
  what you left out.
- Stage whole files. lint-staged runs with `--no-stash` (eslint --fix on code,
  prettier on json/md), so the pre-commit guard refuses any file that has both
  staged and unstaged changes.
- `.claude/` is gitignored on purpose (`.gitignore` is a fingerprint input). Its
  versioned files are force-tracked: stage a **new** file under
  `.claude/{agents,skills,hooks,rules}/` or a new `.claude/settings.json` with
  `git add -f <path>`. For edits to already tracked files there, use `git add -u
  <path>` (plain `git add` stages them but warns about the ignored directory and
  exits 1, which breaks `&&` chains). Never force-add `.claude/settings.local.json`
  or `.claude/worktrees/`.

## 3. Write the message

```
type(scope): subject

Body: why the change was needed, why this approach, what was left alone.
Wrap at 72 columns.
```

- Types: `feat fix refactor perf docs test chore build ci` (`revert`, `style` only when
  tooling generates them).
- Scopes: `app ui nav checkout auth push i18n theme ci native deps release`; several
  join with a comma (`fix(ui,nav): ...`); no scope for repo-wide changes.
- Header: English ASCII, imperative, lower-case start, at most 72 characters, no
  trailing period.
- **No `Co-Authored-By` trailer and no "Generated with" footer** (commitlint rejects
  them).

Pass multi-line messages from a file or heredoc:

```bash
git commit -F /tmp/msg.txt
```

## 4. Confirm

```bash
git log --oneline -1   # lint-staged may have rewritten files; confirm the commit landed
git status --short
```

- Never `--no-verify`, never `git stash` (use `git show HEAD:<path>` to see the
  pristine file; park work in a WIP commit), never amend a pushed commit.
- **Do not push.** Pushing needs the user's explicit approval every time.
