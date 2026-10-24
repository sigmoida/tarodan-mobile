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
tarodan-ops `docs/design-system.md`. Done 2026-10-24: tarodan-app f96c2d751 adds
the file and this branch's copy is identical to it.

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
- `readableContentStyle(base, width)` / `useReadableContentStyle(base)`: a list's
  or ScrollView's `contentContainerStyle` with its side padding widened to that
  gutter (the scroll view keeps the whole window, so the side margins scroll);
  phones get `base` back unchanged.

## Width rule (decided 2026-10-24)

"Same outer frame on every screen, two inner widths by content type." Every
screen starts at the same page gutter; inside it the body is:

- **readable** (672 pt, centred) for everything people read or fill in: forms,
  settings, the profile menu, legal and content pages, auth, payment, gates and
  required steps, the chat thread (its input bar follows), the cart (one column
  for now) and every **row list**: orders, sales, offers, trades, messages,
  notifications, my listings, blocked users, payment history, discounts,
  discount products, following, product reviews, add-to-collection picker,
  manufacturers (`/ureticiler` renders rows, not a grid) and favourites (row
  cards, not a grid);
- **full** (window minus the gutter) for card grids and media: search,
  category, models and model detail, collections and collection detail, seller,
  brand / manufacturer products, my / liked collections, home, product detail
  (keeps its split layout).

Top bars stay full width; only the body changes. `PageShell` `contentWidth`
defaults to `readable` in `scroll` **and `list`** mode (`static` stays `full`),
so the grid list screens opt out with `contentWidth="full"` (6 call sites) and
the row lists keep the default. A shell cannot pad a child's list, so each row
list / tab root wraps its `contentContainerStyle` in `useReadableContentStyle`
(a jest scan, `src/components/common/__tests__/listWidths.test.ts`, requires
every list-mode screen to do one or the other). Floating elements over a
readable body follow it: the cart checkout bar (`useReadableGutter`), the my
listings FAB (`FAB contentWidth="readable"`), `RowListSkeleton`.

Components:

- `PageShell`: new `contentWidth?: 'readable' | 'full'`. `scroll` and `list`
  default to `readable`, `static` to `full` (see "Width rule"). The footer bar
  content is always centred at the readable width. Grid pages pass `full`.
- `FAB`: `contentWidth="readable"` puts a `bottomRight` FAB at the right edge
  of a readable body instead of the window's side gap.
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
| Row lists (`PageShell` list) and the chat thread                                    | `useReadableContentStyle` on the list content; skeletons and empty states inside it follow. Chat: the input bar is the readable footer.                                                                                                                                 |
| Tab roots: profile (member + guest), cart, favourites                               | `useReadableContentStyle` on the scroll content; the cart checkout bar uses the same gutter. Sell already had it (`ListingForm`).                                                                                                                                       |
| Payment card form, gate screens, required steps                                     | `useReadableContentStyle` on their own ScrollViews (required steps: the action bar too); the 3DS page stays full.                                                                                                                                                       |

## Out of scope

- A list-detail (master/detail) layout for row lists is a separate design
  question; rows take the readable width meanwhile.
- A two-column cart on tablets.
- The product list layout (`layout="list"`) stays one column.
- Stat tiles (`settings/business`, seller metrics, seller dashboard) keep their
  2x2 grid; they sit in readable-width pages.
- Home product rails (fixed 160 pt cards, horizontal) are unchanged: a wider
  window simply shows more cards.
- Any native config change (see below).

## Known limitations (accepted for this branch)

- A list whose column count changes (rotation or fold/unfold across a class
  boundary) is re-keyed, so it re-mounts at the top: `FlatList` cannot change
  `numColumns` in place. Within a class nothing re-mounts.
- Grid columns follow the window width, not the grid's measured width; a grid in
  a narrower container (the categories pane, a readable-width page) must pass a
  spec or the page must use `contentWidth="full"`.
- The floating tab bar row is centred while FABs on grid screens keep the
  window's right gutter, so on tablets they no longer share a right edge. To
  judge in the eye-test. The my listings FAB sits at its readable body's edge.
- Nothing enforces the list padding beyond the jest scan: a new row list that
  forgets `useReadableContentStyle` fails the scan, but a list in a child
  component must be added to its `LIST_IN_CHILD` map.
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
- Width rule: `readableContentStyle` (phones return the same object), PageShell
  list mode readable vs full and its skeleton, TitleShell / AppShell (content
  box not narrowed, readable child list), FAB `contentWidth`, and per screen
  group: orders (row list), chat thread (body + input bar), profile (member +
  guest), cart (body + checkout bar); plus the list-mode inventory scan.

Existing tests must stay green. The react-native jest mock reports a
750x1334 window (device pixels of an iPhone 8, read as points), which would be
`medium` and silently move every render test onto the tablet path.
`jest.setup.ts` therefore sets the default window to the same phone in points
(375x667); tests that need another width set it themselves.

Manual (user, simulator): see the eye-test checklist in the hand-over report.
