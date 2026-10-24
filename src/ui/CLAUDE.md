# src/ui — `@/ui` primitives

Vendored `@tarodan/ui-native`, imported as `@/ui` (forms: `@/ui/form`). It mirrors
`@tarodan/ui` (tarodan-app `packages/ui`) naming, props vocabulary and variants; the
parity table is in tarodan-ops `docs/design-system.md`. Tokens: `src/theme/CLAUDE.md`.

## Primitives

- Never rebuild a primitive that exists: `Input`, `Textarea`, `Checkbox`, `Switch`,
  `Radio`, `Select`/`SelectSheet`, `Card`, `SectionCard`, `Badge`, `StatusBadge`,
  `Chip`, `Pill`, `Alert`, `Modal`, `BottomSheet`, `Spinner`, `Avatar`,
  `Stack`/`VStack`/`HStack`, `Divider`, `ProgressBar`, `EmptyState`, `ErrorState`,
  `Accordion`, ...
  Never hand-draw a pill/badge with `View + Text`.
- Need a variant or state that doesn't exist? Add it here (shared), never fork a local
  copy. A new variant is designed on the web side (`@tarodan/ui`) first, or the same
  change checks the web side; otherwise add a backlog line in tarodan-ops.
- Marketplace composites built from primitives (`ProductCard`, `ListingRow`, ...)
  live in `src/components/<feature>/`, not here.

## Raw components

- No raw RN `Text`, `TextInput`, `TouchableOpacity` or `Modal`: use `Text`, `Input`
  (or `RawTextInput`), `Button`/`IconButton`/`Pressable`, `Modal` from `@/ui`. RN
  `Alert` is banned (lint error); `Snackbar` was removed and its import is banned.
- `RawText` is a **temporary** drop-in for legacy raw RN `Text`; don't use it in new
  code.
- No off-scale numeric `fontSize` / `fontWeight` / `borderRadius` / `lineHeight` in a
  `StyleSheet` (`tarodan/no-raw-style-values`): use `theme.typography` / `radiusRole`.

## Large screens

iPad, the foldable iPhone and Android tablets use the same screens; the shared layer
adapts them. Decide by a **measured width** (`useWindowDimensions` / `onLayout`), never
by device model, so Split View, folding, rotation and resizable windows re-lay out. Every
rule is a no-op below 600 pt: phones stay as they are.

- **Edge to edge, re-proportioned.** Every screen spans the window; there is no centred
  narrow column anywhere. A wide window gets a wider gutter and a layout designed for
  the width (more columns, side-by-side panes), never a stretched phone layout and never
  a capped, centred body. Reference: the Amazon iPad app.
- Width class: `windowClassOf(width)` / `useWindowClass()` (`src/ui/lib/windowClass.ts`,
  tokens in `theme.breakpoints`: `medium` >= 600, `expanded` >= 840, `large` >= 1200);
  `isAtLeast(cls, 'expanded')` is the one ordered comparison. Never a local `width > 700`
  check or a hand-written list of classes.
- **Gutter:** `pageGutter(width)` / `usePageGutter()` is THE side padding (16 on phones,
  `spacing[6]` on medium, `spacing[8]` on expanded and large). `tabletSidePadding`
  widens an existing side padding to it (0 stays full bleed); a list or
  ScrollView wraps its `contentContainerStyle` in `usePageContentStyle(base)`. `PageShell`
  applies it to its body, skeleton and footer bar; `ScreenHeader`, the home search bar,
  `InboxRow`, the FAB, the home sections and hero and the search toolbar read it too. A shell cannot pad a child's list, so every
  `mode="list"` screen pads its own (`listGutters.test.ts` checks it).
- **Card grids:** columns from `useGridColumns()` / `gridColumns(width, spec)`
  (`CARD_GRID_COLUMNS` 2 / 3 / 4 / 5). A `FlatList` / `FlashList` puts the count in its
  `key`. Fixed cells use `gridCellWidth` (deduct `2 * pageGutter`); percentage `flexWrap`
  grids use `gridCellStyle(index, columns)` (never `width: '48%'` + `space-between`).
- **Row lists** (orders, sales, offers, my listings, favourites, ...) become card grids:
  `useRowGrid()` (`ROW_CARD_COLUMNS` 1 / 2 / 3 / 4) gives `listKey`, `numColumns` and
  `cell(index, card)`. Divider rows (inbox, notifications, reviews) stay one full-width
  column.
- **Panes:** a screen whose content has a natural second column splits on wider classes
  with its own `_lib/layout.ts` helper (one source per screen): product detail
  (gallery and info as two equal columns from medium), cart (items + summary panel from expanded),
  messages (master–detail from expanded), settings / profile menu cards (two columns
  from expanded, `MenuGroupList`).
- Floating controls may keep a cap: `Modal`, `AlertDialog` and `Toast` cap themselves, and the tab bar pill is centred at
  `TAB_BAR_MAX_WIDTH` (480). `BottomSheet` spans the window like page content. Page content
  never caps.

## Typography

- Noto Sans 400/500/600/700, same as web. The weight -> font-file mapping and the
  -0.01em body letter-spacing live in **one place**, `src/theme/typography.ts`
  (`brandFontStyle`); loading is `useFonts` in `app/_layout.tsx`.
- Never set `fontFamily` per screen; use `Text` variants.

## Icons

- Icons carry function only: back, close, search, cart, favourite, share, menu,
  filter, status icons, and icons the web shows in the same place.
- Decorative icons (in titles, list-row leading, inside buttons, section heads) are
  removed; an icon the web doesn't have is removed by default. `Button` icons are
  limited to an allow-list (`tarodan/restrict-button-icon`). Sheet rows have no icons.

## Press feedback

- Android = `android_ripple`, iOS = the existing pressed opacity, both from
  `androidRipple()` / `rippleClip()` / `showPressedStyle()`
  (`src/ui/lib/pressableFeedback.ts`). Core primitives already do it; a new custom
  `Pressable` uses the same helper (no local ripple config).

## Tap targets

- At least 44 pt (`theme.minTouchTarget`). Visuals may stay at the web size; close the
  gap with `hitSlop` (`Button`, `IconButton`, `Chip` already do). Icon-only buttons
  and images carry `accessibilityLabel` / `accessibilityRole`.

## Dynamic type

- `maxFontSizeMultiplier` comes from `theme.typography.maxFontScale` (body 1.35,
  heading 1.25, control 1.2). `Text` / `RawText` / `RawTextInput` default it per role
  (no global `defaultProps`).
- Fixed-height controls use `minHeight` + vertical padding, never a hard `height`.

## Forms

- All forms use `useZodForm` + `Form` / `FormInput` / `FormError` from `@/ui/form`.
  **No manual `useState`-per-field forms.**
- The zod schema is colocated in the route's `_lib/schema.ts` (or the feature's
  `_lib/schema.ts`); shared field rules come from `@/utils/validation`.

```ts
import { useZodForm, Form, FormInput } from "@/ui/form";
import { offerSchema } from "./_lib/schema";
const form = useZodForm(offerSchema);
```

## Loading

One replaceable system in `src/ui/loading/`, all exported from `@/ui`. List and card
screens use skeletons (web-like); a full-screen `ScreenLoader` only for the very
first load or layout-less flows (payment, gates). Never hand-roll a loader.

- **One indicator:** `LoadingIndicator` (`size` sm 16 / md 20 / lg 36, `tone`
  primary | inverted | muted, `accessibilityLabel`) is the only spinner. `Spinner`
  (alias), `ScreenLoader` and `Button`/`IconButton` `isLoading` all draw it. Raw
  `ActivityIndicator` outside `src/ui/loading/` is lint-warned
  (`tarodan/no-raw-activity-indicator`). To swap the animation (Lottie, Reanimated)
  edit only the inside of `LoadingIndicator.tsx`: keep the box size
  (`theme.loading.indicator.size`), the colour (`theme.loading.indicator.color[tone]`),
  the `progressbar` role and a static frame under reduce-motion. `RefreshControl`
  stays native (tint from tokens only).
- **One skeleton driver:** every skeleton is `SkeletonBlock` (alias `Skeleton`)
  animated by one shared loop (`useSkeletonAnimation`, reduce-motion aware). Look and
  animation are one token,
  `theme.loading.skeleton.{animation, duration, pulseMinOpacity, baseColor, highlightColor}`
  (`animation`: pulse, shimmer or none); never a local
  skeleton colour or `Animated` loop.
- **Layout-faithful blocks** read the real component's geometry so nothing jumps:
  `SkeletonLine` (a `Text` variant's line box), `SkeletonText`, `SkeletonAvatar`
  (`AVATAR_SIZES`), `SkeletonSectionCard` (`SECTION_CARD_METRICS`),
  `SkeletonListRow`, `SkeletonChatBubble` (`CHAT_BUBBLE_METRICS`), and next to their
  components `SkeletonProductCard` (`PRODUCT_CARD_METRICS`; `ProductGridSkeleton`
  uses the real cell width) and `SkeletonMenuRow` (`PROFILE_ROW_METRICS`). A new
  component that needs a skeleton exports its metrics and gets a sibling
  `Skeleton<Name>`.
- **Delayed loading:** `useDelayedLoading(isLoading, { delay, minDuration })` shows
  nothing for loads shorter than `theme.loading.delayMs` (150) and keeps a shown
  loader at least `theme.loading.minVisibleMs` (300). `PageShell` `loading` uses it
  (empty body during the delay, never the old content); use it for a list's
  `ListEmptyComponent` skeleton too. Tests advance jest fake timers by
  `theme.loading.delayMs` instead of expecting an immediate skeleton.
- Showcase: `/tasarim` -> "Yükleme".

## Empty and error states

- Every empty screen, list or section uses `EmptyState`: `icon`, `title` and
  `subtitle` are **required**, the action is optional. Errors use `ErrorState` (+
  "Tekrar Dene" retry); a failed query never leaves the user without a retry.
- Placement is built in: a screen-level state sits `EMPTY_STATE_TOP_OFFSET` (64 pt)
  below the top of the content area (under the bar), 16 pt from the screen edges,
  centred.
  - `placement="screen"` (default): `PageShell` `empty`, an `AppShell` child, or the
    `ListEmptyComponent` of a list **without** a gutter (messages, notifications).
  - `placement="list"`: the `ListEmptyComponent` of a list on `pageListContentStyle`.
    The list's gutter is part of the offset, so as the list's first item it lands
    exactly where `screen` does (pinned in `components/__tests__/EmptyState.test.tsx`).
    Under a `ListHeaderComponent` it sits the list gap + 48 pt below the header
    (64 pt with the default `PAGE_SECTION_GAP`). A shared empty wrapper
    used only in such a list (`OffersEmpty`, `MyListingsEmpty`) sets it inside;
    `ProductListEmpty` takes it as a prop.
  - `placement="inline"`: inside a card, modal or section (and vertically-centred
    gate screens); 24 pt top, 8 pt bottom, 48 pt circle.
  - `ErrorState` takes the same prop. A list skeleton keeps the list gutter (no
    placement), like the `PageShell` skeleton.
- Give each a unique `testID` when several can render on one screen (defaults
  `empty-state` / `error-state`). Never wrap it in extra padding/margin or hand-draw
  View + icon + Text. `tarodan/empty-state-standard` enforces this, and in a
  `ListEmptyComponent` it requires an explicit `placement` (`list` when the list's
  `contentContainerStyle` uses `pageListContentStyle`).

## Accordion

- Collapsible sections are `Accordion > AccordionItem > AccordionTrigger + AccordionContent`
  (web `@tarodan/ui` Accordion names and props: `type` single | multiple, `collapsible`,
  `value` / `defaultValue` / `onValueChange`). Never hand-roll a show/hide row.
- The root draws no box, so it can wrap a `FlatList` whose rows are items (payment history).
  `AccordionItem` draws no border either: put it in a `ListRowCard` / `SectionCard`.
- The trigger is a 44 pt `button` with `accessibilityState.expanded` and a rotating chevron;
  height and opacity animate over `theme.duration.normal`, instantly under reduce motion. The
  content mounts only while open (and during the close animation).

## Feedback

- Info/success -> `toast` / `toast.success` (web react-hot-toast equivalent).
  Anything that needs confirmation, or an error the user must act on -> `appAlert`.
- Yes/no -> `if (!(await confirm({ title, message, destructive }))) return;` (web
  ConfirmProvider signature). It resolves after the dialog has closed, so a following
  toast, navigation or modal is iOS-safe.
- Toasts draw in the topmost layer (`ToastLayer` inside `Modal`, `AlertDialog`,
  `BottomSheet`), above open dialogs/sheets, the keyboard, the tab bar and the
  `PageShell` footer (`useToastBottomInset`, focus-scoped).
- `appAlert` buttons: two that fit sit side by side with `cancel` on the LEFT;
  stacked (labels don't fit, or 3+ buttons) the `cancel`-styled button is at the
  BOTTOM; the others keep the caller's order. Button labels never wrap or truncate
  (`ButtonRow`). `cancelable` defaults to `true` with a `cancel` button or a single
  button (Android back / backdrop = that button); pass `cancelable: false` for alerts
  the user must read (payment uncertainty).
- Unprompted global dialogs (offline, permission rationale) wait for open modals via
  `src/ui/lib/modalPresence.ts`.

## Bottom sheets

- Everything that slides up is `BottomSheet` / `SelectSheet` / `ActionSheet`; never a
  sheet built on a raw RN `Modal`.
- `BottomSheet` owns grabber + `SheetHeader`, drag-to-close, Android back, the fixed
  safe-area/keyboard-aware `footer` (buttons via `ButtonRow`) and
  `size="fit" | "large"`. Pick lists = `SelectSheet` (search, single/multi); menus =
  `ActionSheet` (never `appAlert` buttons).
- Modal/sheet titles are `SheetHeader` (title left, close right, same height;
  `fullScreen` adds the Android top inset; pair it with `statusBarTranslucent`).
- A multi-field form is a separate screen (`PageShell`), not a sheet.

## iOS modal rule

Presenting a second native layer while a modal or sheet is open freezes iOS.

- **Modals never wait for a mutation.** Validate, `onClose()` first, then fire the
  mutation; progress and result go to a toast or the list state. `ModalFooter` has no
  `isLoading` on purpose; never hold a modal open on `isPending`. Validation errors
  stay inside the modal (`ModalMessage`).
- A mutation's `appAlert` (success or error) while a `@/ui` `Modal` is open freezes
  iOS. That is why the modal closes before the mutation fires.
- A follow-up native presentation (appAlert, another modal, a picker, a system
  permission dialog, navigation) runs **after** the sheet has closed: `onClosed` /
  `useBottomSheet().runAfterClose(fn)` (ActionSheet rows do this), or
  `runAfterModalClose` for modals. No ad-hoc `setTimeout` hacks.
