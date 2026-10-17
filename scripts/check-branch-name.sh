#!/bin/sh
# Branch-name check for the husky pre-push hook. Rules: tarodan-ops
# docs/commit-and-branch-rules.md. Kept light on purpose: no tests here.
#
# Usage:
#   scripts/check-branch-name.sh            reads git pre-push lines on stdin
#                                           ("<local ref> <sha> <remote ref> <sha>")
#   scripts/check-branch-name.sh <branch>   checks one name (manual use, tests)
#
# Allowed: development, master, worktree-* (tool-generated, never meant to be
# pushed but not blocked here), and <type>/<kebab-description>.

PATTERN='^(feat|fix|refactor|perf|chore|ci|docs|test|hotfix)/[a-z0-9-]+$'

check() {
  case "$1" in
    development | master | worktree-*) return 0 ;;
  esac
  if printf '%s\n' "$1" | grep -Eq "$PATTERN"; then
    return 0
  fi
  echo "pre-push: branch name '$1' does not match <type>/<kebab-description>" >&2
  echo "  types: feat fix refactor perf chore ci docs test hotfix (e.g. fix/offer-counter-lock)" >&2
  echo "  rename it: git branch -m <new-name>" >&2
  return 1
}

if [ $# -gt 0 ]; then
  check "$1"
  exit $?
fi

status=0
checked=0
zero='0000000000000000000000000000000000000000'
while read -r local_ref local_sha remote_ref remote_sha; do
  [ -z "$remote_ref" ] && continue
  checked=1
  # Deletions and tags are not branch names to validate.
  [ "$local_sha" = "$zero" ] && continue
  case "$remote_ref" in
    refs/heads/*) check "${remote_ref#refs/heads/}" || status=1 ;;
  esac
done

if [ "$checked" -eq 0 ]; then
  branch=$(git branch --show-current)
  [ -n "$branch" ] && { check "$branch" || status=1; }
fi

exit $status
