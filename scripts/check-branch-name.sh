#!/bin/sh
# Branch-name check for the husky pre-push hook. Rules: tarodan-ops
# docs/commit-and-branch-rules.md. Kept light on purpose: no tests here.
#
# Usage:
#   scripts/check-branch-name.sh            reads git pre-push lines on stdin
#                                           ("<local ref> <local sha> <remote ref> <remote sha>")
#   scripts/check-branch-name.sh <branch>   checks one local name (manual use, tests)
#
# Enforced only where a name is being chosen:
#   - creating a new remote branch (remote sha is all zeros): the new name must match,
#     and tool-generated worktree-* names are local-only (never created remotely);
#   - pushing into development or master: the LOCAL branch must be development,
#     master or a valid <type>/ branch (no stray or worktree-* branch pushed there).
# Updates to an existing remote branch (e.g. dependabot/*), tags and deletions pass.
#
# Valid names: development, master, integration/<wave>, <type>/<kebab-description>,
# and (local only) worktree-*. Types match the hub commit-and-branch rules.

PATTERN='^((feat|fix|refactor|perf|chore|ci|docs|test|hotfix|build|integration)/[a-z0-9-]+)$'
ZERO='0000000000000000000000000000000000000000'

valid() {
  case "$1" in
    development | master | worktree-*) return 0 ;;
  esac
  printf '%s\n' "$1" | grep -Eq "$PATTERN"
}

reject() {
  echo "pre-push: branch name '$1' does not match <type>/<kebab-description>" >&2
  echo "  types: feat fix refactor perf chore ci docs test hotfix build (e.g. fix/offer-counter-lock)," >&2
  echo "  or integration/<wave>; rename it with: git branch -m <new-name>" >&2
  return 1
}

check() { valid "$1" || reject "$1"; }

# For names that leave this machine: worktree-* is tool-generated and local-only.
check_shared() {
  case "$1" in
    worktree-*)
      echo "pre-push: '$1' is a local worktree branch; rename it (git branch -m <type>/<name>) or merge it locally" >&2
      return 1
      ;;
  esac
  check "$1"
}

if [ $# -gt 0 ]; then
  check "$1"
  exit $?
fi

status=0
while read -r local_ref local_sha remote_ref remote_sha; do
  [ -z "$remote_ref" ] && continue
  [ "$local_sha" = "$ZERO" ] && continue          # deletion
  case "$remote_ref" in
    refs/heads/*) ;;
    *) continue ;;                                 # tags and other refs
  esac
  remote_branch=${remote_ref#refs/heads/}
  case "$local_ref" in
    refs/heads/*) local_branch=${local_ref#refs/heads/} ;;
    *) local_branch="" ;;
  esac

  if [ "$remote_sha" = "$ZERO" ]; then
    check_shared "$remote_branch" || status=1        # creating a new remote branch
  elif [ "$remote_branch" = development ] || [ "$remote_branch" = master ]; then
    if [ -n "$local_branch" ]; then
      check_shared "$local_branch" || status=1
    fi
  fi
done

exit $status
