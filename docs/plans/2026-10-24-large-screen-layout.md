# Large-screen layout (iPad, foldable iPhone, Android tablets)

Status: in progress on `feat/app-large-screen-layout` (not for release until the
user has eye-tested it in the simulator). Revised 2026-10-24 after the first iPad
eye-test: the readable column is replaced by edge-to-edge layouts.

## Problem

There is no width concept in the app. Every screen draws the phone layout
stretched to the window: the home hero takes ~58% of an iPad screen, the product
gallery is an 820 pt square, grids stay at two columns, forms run ~790 pt wide,
bottom sheets and the floating tab bar span the whole window.

Targets: iPad portrait (iPad Air 11" 820x1180 pt, iPad 13" 1032x1376 pt), the
foldable iPhone (inner ~626x890 pt, outer ~466x678 pt; folding resizes the window
at runtime), Android tablets and foldables (which rotate to landscape on
Android 16 regardless of the manifest lock, see "Native side").

## Principles

- Decisions use the **measured window width** (`useWindowDimensions`) or a
  component's own width, never the device model. Split View, Stage Manager, the
  folding iPhone and Android resizable windows then work the same way, and a
  runtime resize re-lays out.
- **Phones stay pixel-identical.** Every rule below is a no-op under 600 pt.
- **Edge to edge, designed for the width (decided 2026-10-24, after the first iPad
  eye-test).** The centred 672 pt "readable" column was rejected: it read as a
  stretched phone. Every screen spans the window with a wider tablet gutter, and
  layouts re-proportion by width class (more columns, side-by-side panes) in
  portrait and landscape. Reference: the Amazon iPad app.
- One source of truth: the width classes are tokens; one hook classifies the width;
  one helper per decision (gutter, card grid columns, row grid columns, each
  screen's pane split).

## Width classes (tokens)

`src/theme/breakpoints.ts`, exposed as `theme.breakpoints` and
`theme.contentWidths`. They match the Material window size classes:

| Class      | Window width   | Examples                                                        |
| ---------- | -------------- | --------------------------------------------------------------- |
| `compact`  | < 600 pt       | every phone, foldable iPhone outer display                      |
| `medium`   | 600 to 839 pt  | foldable iPhone inner (626), iPad Air 11" portrait (820)        |
| `expanded` | 840 to 1199 pt | iPad 13" portrait (1032), iPad Air 11" landscape (1180)         |
| `large`    | >= 1200 pt     | iPad 13" landscape (1366), Android tablets in landscape (1280+) |

`contentWidths.readable = 672` stays in `src/theme` as the synced copy of the
upstream token (tarodan-app `packages/design-tokens/src/breakpoints.ts`,
f96c2d751), but app code no longer uses it (a jest scan forbids it in page code).
Whether upstream keeps it is a design-system decision for tarodan-ops.

## Shared layer (`@/ui`)

`src/ui/lib/windowClass.ts`:

- `windowClassOf(width)` and `useWindowClass()`.
- `pageGutter(width)` / `usePageGutter()`: the side gutter, `PAGE_GUTTERS` =
  16 (compact), `spacing[6]` 24 (medium), `spacing[8]` 32 (expanded, large).
  `tabletSidePadding(own, width)` widens an existing side padding to it (phones and
  full-bleed 0 sides unchanged); `pageContentStyle(base, width)` /
  `usePageContentStyle(base)` apply it to a list's `contentContainerStyle`.
- `CARD_GRID_COLUMNS` (2 / 3 / 4 / 5) with `gridColumns` / `useGridColumns`,
  `gridCellWidth`, `gridCellStyle`: card grids.
- `ROW_CARD_COLUMNS` (1 / 2 / 3 / 4) and `useRowGrid()` (`src/ui/lib/rowGrid.tsx`):
  row lists as card grids (`listKey`, `numColumns`, `cell(index, card)`).

Applied in the shared components: `PageShell` (body, skeleton, footer bar),
`ScreenHeader`, the home `FloatingSearchBar`, `InboxRow`, `FAB`, `RowListSkeleton`,
`ProductGrid` / `productCellWidth`, `MenuGroupList`. `BottomSheet` spans the window on
tablets too (user decision 2026-10-24; the 640 pt cap was dropped).

## Screens

| Screen                                                                          | Phone (< 600)                         | Medium (600 to 839)                                                                                                                                                                           | Expanded / large (>= 840)                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Product detail                                                                  | gallery square above, stacked buy bar | split: gallery and info as two equal columns, the specs cards in the same columns below, reviews and similar listings full width; one-row bar (price left, offer / trade / buy actions right) | same split; one-row bar (price left, offer / trade / buy actions right)      |
| Cart                                                                            | one column, floating checkout bar     | one column, full-width bar, button at natural width                                                                                                                                           | items 62% left, summary + checkout panel right (own scroll), no floating bar |
| Orders, sales, offers, trades, following, my listings, blocked users            | one column of cards                   | 2-column card grid                                                                                                                                                                            | 3 columns (expanded), 4 (large)                                              |
| Payment history, discounts, discount products, favourites, manufacturers        | one column                            | 2-column grid                                                                                                                                                                                 | 3 / 4 columns                                                                |
| Notifications, product reviews                                                  | full-width divider rows               | same, at the tablet gutter                                                                                                                                                                    | same                                                                         |
| Messages                                                                        | inbox, thread pushed                  | inbox, thread pushed                                                                                                                                                                          | master–detail: inbox 35% left, selected thread right (in place)              |
| Settings, profile menu                                                          | one column of section cards           | one column at the tablet gutter                                                                                                                                                               | two independent, balanced columns of section cards                           |
| Forms (edit profile, address, listing form, auth, payment card, required steps) | as before                             | full width at the tablet gutter                                                                                                                                                               | same (no paired fields: no form row component exists, forms not rebuilt)     |
| Home, search, category, collections, models, seller, brand / manufacturer       | 2-column grids                        | 3 columns                                                                                                                                                                                     | 4 / 5 columns; rails show more cards; nothing capped                         |
| Tab bar                                                                         | fixed 5-item pill, window width       | centred floating pill, 480 pt                                                                                                                                                                 | centred floating pill, 480 pt                                                |

## Tab bar (decided 2026-10-24)

The bottom tab bar is fixed: it no longer collapses on scroll, on any width. One
pill with five items, Home, Favorites, "+" (İlan Ver / Sell), Cart, Profile, the
"+" in the centre with a label (`mobile.tabBarSellLabel`) and its icon in a filled
primary circle. The pill has the card border (1 pt `border.DEFAULT`) on the glass
and the opaque surface. Lists feed only the top bar edge (`usePageOffsetHandler`,
`usePageScrollHandler`). The search screen's floating scroll-to-top button is gone.
Phones change visibly here by the user's request.

## Out of scope

- Paired form fields side by side: there is no shared form row component, and the
  brief excludes rebuilding forms.
- The product list layout (`layout="list"`) stays one column.
- Home product rails (fixed 160 pt cards, horizontal) are unchanged: a wider window
  simply shows more cards.
- Deep links and push notifications open `/messages/[threadId]` full screen on every
  width (not into the master–detail pane).
- Any native config change (see below).

## Known limitations (accepted for this branch)

- A list whose column count changes (rotation or fold/unfold across a class
  boundary) is re-keyed, so it re-mounts at the top: `FlatList` cannot change
  `numColumns` in place. Within a class nothing re-mounts.
- Grid columns follow the window width, not the grid's measured width.
- In a row grid an expanding card (order groups, payment history accordions) makes
  its row taller; the neighbour keeps its height with empty space below.
- The messages pane selection is local state: closing the messages screen and
  opening it again shows the placeholder (a push from the pane and back keeps it).
  When the window narrows below expanded with a conversation open, the same tree
  stays mounted: the inbox pane hides and the conversation takes the window with a
  back arrow (and Android back) that closes it; the draft survives.
- Row list skeletons stay one column, so a grid list jumps once when the data
  arrives on tablets.

## Native side (decision for the user, not in this branch)

Changing native config changes the fingerprint and needs a store build, so this
branch does not touch `app.json`, `app.config.js`, the manifest or Info.plist.

- **iOS:** `ios.requireFullScreen: true` + `orientation: "portrait"` keep iPad
  in portrait full screen (no Split View / Slide Over). iPadOS 26 deprecates
  `UIRequiresFullScreen` and a future SDK will ignore it; then iPad windows are
  resizable and can be landscape anyway. Recommendation: drop
  `requireFullScreen`, allow all orientations on iPad only
  (`UISupportedInterfaceOrientations~ipad`), keep phones portrait. This branch
  already reacts to runtime size changes, so the remaining work is a landscape
  eye-test pass. Done on the follow-up branch `build/app-ipad-multitasking`
  (store build only; iPhone stays portrait).
- **Android:** with targetSdk 36, Android 16 ignores `screenOrientation` and
  `resizeableActivity` on displays with smallest width >= 600 dp. Tablets and
  unfolded foldables rotate and resize. The temporary opt-out is the manifest
  property `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`
  (honoured for targetSdk 36 only; removed with targetSdk 37). Recommendation:
  do not opt out; ship the responsive layout and test landscape, because the
  opt-out only postpones the work by one SDK year.

## Test plan

Unit (jest, `--maxWorkers=2`):

- `windowClassOf` boundaries, `gridColumns`, `gridCellStyle`, `pageGutter`,
  `tabletSidePadding`, `pageContentStyle` (phones return the same object),
  `ROW_CARD_COLUMNS` and `useRowGrid` at 390 / 820 / 1032 / 1180 / 1366.
- PageShell body, skeleton and footer gutter, TitleShell / AppShell, FAB.
- Product detail: split at 820 and 1180, phone layout at 390, one-row buy bar.
- Cart: two columns at 1032 / 1180, one column at 820 / 390.
- Row lists: orders grid columns at 390 / 820 / 1032 / 1366; a scan that every
  listed row list uses `useRowGrid`; a scan that every `mode="list"` screen pads
  its list with the gutter and nothing uses `contentWidths.readable`.
- Messages: master–detail at 1032 (selecting a thread renders it on the right, no
  push), push at 820 / 390.
- Settings and profile: two columns at 1032, one at 820 / 390.
- Tab bar: five items, "+" at index 2 with its label, navigation, a11y, border,
  scrolling never changes the bar, no FAB on bar screens.

The react-native jest mock reports a 750x1334 window (device pixels of an iPhone 8,
read as points), which would be `medium`. `jest.setup.ts` therefore sets the
default window to 375x667; tests that need another width set it themselves.

Manual (user, simulator): see the eye-test checklist in the hand-over report.
