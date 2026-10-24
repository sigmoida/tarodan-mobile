# Large-screen layout (iPad, foldable iPhone, Android tablets)

Status: in progress on `feat/app-large-screen-layout` (not for release until the
user has eye-tested it in the simulator).

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
- **Phones stay pixel-identical.** Every rule below is a no-op under 600 pt
  (and the width caps are larger than any phone).
- One source of truth: the width classes and content widths are tokens; one
  hook classifies the width; one helper derives grid column counts.

## Width classes (tokens)

`src/theme/breakpoints.ts` (new), exposed as `theme.breakpoints` and
`theme.contentWidths`. They match the Material window size classes:

| Class      | Window width   | Examples                                                 |
| ---------- | -------------- | -------------------------------------------------------- |
| `compact`  | < 600 pt       | every phone, foldable iPhone outer display               |
| `medium`   | 600 to 839 pt  | foldable iPhone inner (626), iPad Air 11" portrait (820) |
| `expanded` | 840 to 1199 pt | iPad 13" portrait (1032), small tablets in landscape     |
| `large`    | >= 1200 pt     | Android tablets in landscape (1280+)                     |

`contentWidths.readable = 672` (web `max-w-2xl`, the width web uses for form
and detail pages).

**Upstream:** `src/theme` is a synced copy of tarodan-app
`packages/design-tokens`. The same `breakpoints` and `contentWidths` tokens have
to be added there (a new `breakpoints.ts`, exported from the package index; web
keeps its Tailwind `screens`, which serve CSS media queries) with a note in
tarodan-ops `docs/design-system.md`. This branch does not edit tarodan-app; the
orchestrator schedules that change before this branch merges.

## Shared layer (`@/ui`)

`src/ui/lib/windowClass.ts`:

- `windowClassOf(width)` and `useWindowClass()`.
- `CARD_GRID_COLUMNS` (`compact 2, medium 3, expanded 4, large 5`, web listings
  `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) and `gridColumns(width, spec?)` /
  `useGridColumns(spec?)`: the one column-count rule for card grids.
- `gridCellStyle(index, columns, gapPercent)`: width + left margin in percent
  for the `flexWrap` grids that used `width: '48%'` + `space-between` (two
  columns give exactly the old 48% / 4% geometry; a short last row stays
  left-aligned, which `space-between` would not do with 3+ columns).
- `readableGutter(width, gutter)` / `useReadableGutter(gutter)`: the side
  padding that centres content at `contentWidths.readable`.

Components:

- `PageShell`: new `contentWidth?: 'readable' | 'full'`. `scroll` mode defaults
  to `readable` (forms, settings, detail pages); `list` / `static` default to
  `full` (lists bring their own FlatList). The footer bar content is always
  centred at the readable width. Grid pages in `scroll` mode pass `full`.
- `BottomSheet` (and so `SelectSheet` / `ActionSheet`): centred, max width
  640 pt (Material bottom sheet max width).
- `AppTabBar`: the pill + "+" row is capped at 480 pt and centred; the "+"
  travel derives from the row width, not the window width.
- `ZoomableImage`: `useWindowDimensions` instead of a module-level
  `Dimensions.get`; the image square is `min(width, page height)` so landscape
  does not crop it.

## Screens

| Screen / component                                                                  | Change                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home hero (`app/(tabs)`)                                                            | From `medium` up the slide is split like web `md`: image (4:3, at most 480 pt wide) beside the text, `imageSide` decides the side, the desktop image is used. `heroReservedHeight` follows the same geometry.                                                           |
| Home "Top collections"                                                              | Column count from `useGridColumns`.                                                                                                                                                                                                                                     |
| Product detail                                                                      | `compact`: unchanged. `medium`: gallery square capped at 480 pt, centred. `expanded`+: gallery (max 560 pt) beside the title / price / description / seller column; specs, reviews and similar listings below. The top bar threshold reads the same `useGallerySize()`. |
| `ProductGrid`, `ProductGridSkeleton`                                                | Columns from `useGridColumns`; the cell width and the `FlatList` key follow it.                                                                                                                                                                                         |
| Search                                                                              | Columns from `useGridColumns` (FlashList key already includes the count). `SEARCH_NUM_COLUMNS` goes.                                                                                                                                                                    |
| Categories                                                                          | Grid columns from the window class; the FlatList is re-keyed on change; skeleton follows.                                                                                                                                                                               |
| Collections browse                                                                  | Columns from `useGridColumns`; re-keyed; skeleton rows follow.                                                                                                                                                                                                          |
| Seller profile, collection detail, models, my / liked collections, similar listings | `gridCellStyle` + `useGridColumns`; the `scroll` page passes `contentWidth="full"`.                                                                                                                                                                                     |
| Listing create / edit form                                                          | Its own ScrollView uses `useReadableGutter`.                                                                                                                                                                                                                            |
| Forms and settings (`PageShell` scroll)                                             | Centred at 672 pt automatically.                                                                                                                                                                                                                                        |

## Out of scope

- Row lists in `list` mode (orders, addresses, notifications, messages) stay full
  width; a list-detail (master/detail) layout is a separate design question.
- The product list layout (`layout="list"`) stays one column.
- Stat tiles (`settings/business`, seller metrics, seller dashboard) keep their
  2x2 grid; they sit in readable-width pages.
- Home product rails (fixed 160 pt cards, horizontal) are unchanged: a wider
  window simply shows more cards.
- Tab-root shells (`AppShell`: profile, cart, favourites) keep full width.
- Any native config change (see below).

## Known limitations (accepted for this branch)

- A list whose column count changes (rotation or fold/unfold across a class
  boundary) is re-keyed, so it re-mounts at the top: `FlatList` cannot change
  `numColumns` in place. Within a class nothing re-mounts.
- Grid columns follow the window width, not the grid's measured width; a grid in
  a narrower container (the categories pane, a readable-width page) must pass a
  spec or the page must use `contentWidth="full"`.
- The floating tab bar row is centred while FABs keep the window's right gutter,
  so on tablets they no longer share a right edge. To judge in the eye-test.
- Collection cells now have a fixed width: an odd last card on a phone is half
  wide (it stretched across the row before). Every other phone layout is
  unchanged.

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
  eye-test pass.
- **Android:** with targetSdk 36, Android 16 ignores `screenOrientation` and
  `resizeableActivity` on displays with smallest width >= 600 dp. Tablets and
  unfolded foldables rotate and resize. The temporary opt-out is the manifest
  property `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`
  (honoured for targetSdk 36 only; removed with targetSdk 37). Recommendation:
  do not opt out; ship the responsive layout and test landscape, because the
  opt-out only postpones the work by one SDK year.

## Test plan

Unit (jest, `--maxWorkers=2`):

- `windowClassOf` boundaries (599 / 600 / 839 / 840 / 1199 / 1200),
  `gridColumns` per class and with a custom spec, `gridCellStyle` (2 columns =
  48% / 4%, 3 and 4 columns sum to <= 100%), `readableGutter` (phone =
  gutter, iPad = centred).
- `heroReservedHeight`: phone formula unchanged; split geometry at 626 / 820 /
  1032; capped image width.
- Product gallery size: phone = width, medium cap, expanded split cap; the top
  bar threshold uses it.
- `tabBarRowWidth`: phone = window minus gutters, wide = cap.
- Render tests with a mocked window width (390 / 820 / 1032 / 626): PageShell
  readable padding and footer cap, BottomSheet max width, ProductGrid column
  count and key, hero split layout.

Existing tests must stay green. The react-native jest mock reports a
750x1334 window (device pixels of an iPhone 8, read as points), which would be
`medium` and silently move every render test onto the tablet path.
`jest.setup.ts` therefore sets the default window to the same phone in points
(375x667); tests that need another width set it themselves.

Manual (user, simulator): see the eye-test checklist in the hand-over report.
