---
name: token-sync
description: Sync design tokens from tarodan-app packages/design-tokens into tarodan-mobile src/theme (manual process until the sync script exists), or check drift. Use when a colour, spacing, radius, typography, shadow, motion or z-index token is added or changed.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(npx tsc --noEmit *) Bash(pnpm lint *) Bash(pnpm test *)
---

# Token sync (manual for now)

Source of truth: tarodan-app `packages/design-tokens/src/`. Mobile `src/theme/` holds
a synced copy (`src/theme/CLAUDE.md`, tarodan-ops `docs/design-system.md`). A
`scripts/token-sync` script with `--check` in CI is planned; until then do this by
hand and keep it small.

## Rules

- A new or changed token lands in tarodan-app design-tokens **first** (its own
  change, reviewed there). Mobile never invents a token.
- Synced files: `colors.ts`, `spacing.ts`, `radius.ts`, `typography.ts`,
  `shadows.ts`, `motion.ts`, `z-index.ts`. Never touch `roles.ts`, `catalog.ts`,
  `index.ts` in a sync (roles may then be updated deliberately, in the same change).
- Platform transforms (rem -> pt, CSS shadow -> RN shadow/elevation, font weight ->
  Noto Sans file) are applied consistently; keep the existing mobile form.
- Reconciling the existing drift (colors, motion, shadows, typography) is a backlog
  item, not part of an unrelated sync.

## Steps

1. Record the source commit:

```bash
git -C ../tarodan-app log -1 --format='%h %s' -- packages/design-tokens
```

2. See what differs (identical today: spacing, radius, z-index):

```bash
for f in colors spacing radius typography shadows motion z-index; do
  diff -u ../tarodan-app/packages/design-tokens/src/$f.ts src/theme/$f.ts > /tmp/token-$f.diff && echo "$f identical" || echo "$f differs"
done
```

3. Port **only** the new/changed token(s) into the matching `src/theme/*.ts` file,
   applying the platform transform. Don't reformat or reorder unrelated lines.
4. If a role should use it, update `roles.ts` and the consumer through
   `theme.*` from `@/ui`; no hex in screens.
5. Verify, one at a time:

```bash
npx tsc --noEmit
pnpm lint
pnpm test --maxWorkers=2 src/ui src/theme
```

6. Commit with `theme` scope, naming the source commit in the body, e.g.
   `feat(theme): sync warning-50 from design-tokens`.
