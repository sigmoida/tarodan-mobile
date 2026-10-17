# src/theme — design tokens

Raw design tokens plus mobile role tokens. Screens read them through `theme` from
`@/ui` (`src/ui/lib/theme.ts` assembles it); `@/theme` exports only the raw tokens
and has no `theme` export.

## Token source and sync

- **The source of truth is tarodan-app `packages/design-tokens/src/`** (`colors`,
  `spacing`, `radius`, `typography`, `shadows`, `motion`, `z-index`). The matching
  files here are a **synced copy**, not an independent source.
- Never add a colour, size, shadow or duration here ad hoc. A new token goes into
  tarodan-app `packages/design-tokens` first and is then synced (`token-sync`
  skill: manual today, a `scripts/token-sync` script with a CI drift check later).
  Platform transforms (rem -> pt, CSS shadow -> RN shadow/elevation, font weight ->
  font file) belong in the sync, not in hand edits.
- Mobile-only files that the sync leaves alone: `roles.ts` (role tokens derived from
  the shared tokens), `catalog.ts` (data constants only: scales, brands, conditions;
  the old `TarodanColors` palette is gone), `index.ts`.
- **Current drift (2026-10-17):** `spacing.ts`, `radius.ts`, `z-index.ts` are
  identical to design-tokens; `colors.ts`, `motion.ts`, `shadows.ts`,
  `typography.ts` differ. Part of it is legitimate platform transformation.
  Reconciling it is a tarodan-ops backlog item; don't "fix" it as a side effect.
- Light theme only; there is no dark mode on any platform.

## Using tokens

```ts
import { theme } from '@/ui';
const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface.DEFAULT, padding: theme.spacing[4],
          borderRadius: theme.radiusRole.card },
});
```

- **No hardcoded hex / rgba** in screens or components (lint error). A translucent
  overlay uses `theme.colors.overlay.*`. Only `src/theme/**` and `src/ui/lib/theme.ts`
  may hold raw colour literals.
- Never import `src/theme/colors.ts` directly in a screen and never re-declare a hex;
  go through `theme.colors.*`.
- `spacing` keys are **numeric** (`theme.spacing[4]` = 16 pt, `[2]` = 8, `[1]` = 4);
  there is no `spacing.md` / `sm` / `xs`.
- `radius` keys: `sm`, `DEFAULT`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`.
- Top-level `colors` keys: `primary`, `danger`, `success`, `info`, `warning`, `gray`,
  `text`, `surface`, `border`, `white`, `black`, `transparent` (no `background`).
  Confirm exact names here before using one you haven't seen in surrounding code.

## Role tokens

`roles.ts`, re-exported on `theme.*`. Use a role, never a raw number (`fontSize: 13`,
`borderRadius: 12` are off-scale and lint-warned):

- `iconSize` (16/20/24), `controlHeight` (32/40/48/56), `minTouchTarget` (44),
  `headerHeight` (52).
- `radiusRole`: `productCard` 4; `card` / `section` / `button` / `input` / `badge` 6;
  `modal` 8; `sheet` 2xl; `chip` / `avatar` / `counter` full.
- `priceColor`, `counterBadgeColor` (danger-500), `theme.shadow`, `theme.duration`
  (150/250/400), `theme.loading` (see `src/ui/CLAUDE.md` › Loading).
- A new role is derived from shared tokens; if it needs a new base value, that value
  goes to design-tokens first.
