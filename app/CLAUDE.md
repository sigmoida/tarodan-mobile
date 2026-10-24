# app/ — routes and screens

expo-router routes. Read this before adding a route, screen, section or modal.
Data rules: `src/lib/query/CLAUDE.md`; primitives and feedback: `src/ui/CLAUDE.md`.

## Route groups

- Separate concerns with route groups (`(auth)`, `(tabs)`, ...), each with its own
  `_layout.tsx`. One screen = one concern.
- A screen that swaps between two distinct flows via a mode flag is **two routes**.
- There is no SSR / metadata story on native; that web rule drops.

## Private folders

expo-router does **not** hide `_` folders by itself: every `.ts/.tsx` under `app/` is
a route (only `+api`/`+html`/`+middleware` are skipped). This repo hides them with
`patches/expo-router@6.0.24.patch` (pnpm `patchedDependencies`):

- Any path segment starting with `_` (`_hooks/`, `_lib/`, `__tests__/`, `_foo.tsx`
  and everything inside a `_` folder) is excluded from the route scan and typed
  routes. Only files named `_layout` / `_sitemap` (+ optional
  `.ios/.android/.native/.web`) stay routes. Never name a route file `_something.tsx`.
- `__tests__` is also kept out of the bundle by Metro's default `blockList`.
- `expo-router` is pinned to the **exact** version in `package.json` (no `~`): the
  patch key is version-bound and a silent bump fails install (`ERR_PNPM_UNUSED_PATCH`).
- `patches/**` is in `.fingerprintignore` (the patch is JS-only, so it must not change
  `runtimeVersion` or break OTA). A patch that touches native code must narrow that line.
- Guarded by `__tests__/routerPrivateFolders.test.ts` (reads the regexes from
  `node_modules`, so a lost patch fails it). On any expo-router upgrade, re-create
  the patch (`pnpm patch expo-router@<new>`) and run that test.
- Shared / non-route code goes under `src/` (current Expo practice); only small
  route-specific helpers stay in colocated `_` folders.

## Folder shape

```
app/<group>/<route>/
  index.tsx        # THIN screen: hooks + sections + modals (< ~150 lines)
  _lib/            # types.ts (route DTOs), schema.ts (zod), status.ts (labels, tabs,
                   # status maps: the single source for this route), derive.ts (pure)
  _hooks/          # useXxx.ts (query hook), useDoXxx.ts (mutation hook)
  _sections/       # large screen sections / steps
  _components/     # route-local cards / rows
  _modals/         # dialogs; each owns its useZodForm + mutation
  [id]/            # dynamic segment; same shape
```

`[id].tsx` may become `[id]/index.tsx`; expo-router resolves the directory and tests
importing `../[id]` keep working.

## Thin screens

- A screen (`index.tsx`) mostly **composes**: it calls its hooks and renders its
  sections and modals. Target < ~150 lines; a 1000+ line screen must be split
  (copy the shape of the worked examples).
- Fetching, mutations, form submission and side effects live in colocated `_hooks/`;
  business logic, status maps and schemas in `_lib/`. Feedback strings, status
  colours and formatting live in `_lib/status.ts` (or the shared maps), not scattered
  in JSX.
- **Hooks are called unconditionally before any early return** (`isLoading`,
  not-found, guest gate). A controller hook that needs the entity accepts a nullable
  value with guarded handlers so the hook order stays stable while loading.

## Modals

- Every dialog/modal is its **own** component in `_modals/`, owning its
  `useZodForm` + zod schema + mutation hook. The screen holds only open/close state
  (`useState<Offer | null>`).
- Close the modal **before** the mutation fires; never hold it open on `isPending`
  (see `src/ui/CLAUDE.md` › iOS modal rule).
- A multi-field form is a separate screen (`PageShell`), not a sheet or modal.

## Worked examples

Copy these shapes when splitting a bloated screen.

- **`app/offers/` (canonical).** 1179 lines -> ~130-line `index.tsx`. `_lib/types.ts`,
  `_lib/status.ts` (STATUS_CONFIG + formatters, single source), `_lib/schema.ts`
  (zod factories with dynamic bounds); query hooks `useOffers`,
  `useCommissionPreview` (replaces a `useEffect` + fetch); `useOfferActions`
  (accept/reject/cancel, owns `appAlert` + invalidation); `useDoCounterOffer` /
  `useDoBuyerCounter` owned by their modals; `useInvalidateOffers` (shared
  invalidation set). Per-item spinner comes from `mutation.variables`.
- **`app/product/[id]/` (heavy screen).** 1530 -> ~215 lines. `useProduct` owns the
  view-count POST + list invalidation; `useProductActions` centralises toast and
  every handler (cart/offer/trade/report/share) and accepts a nullable product;
  presentational `ProductInfo`, `SellerCard`, `ProductBottomBar`, `ProductGallery`.
  A loose route-local `Product` DTO with an index signature keeps the gradual `any`
  migration from blocking the split.
- **`app/trade/[id]/` (status machine).** 1830 -> ~170 lines. One `useTradeActions`
  controller owns all mutations + feedback + both modals' UI state; a pure
  `_lib/derive.ts` computes every derived value once; status-conditional JSX splits
  into `TradeStatusHeader` / `TradeShippingSection` / `TradeActions`, each returning
  `null` when its branch is inactive. `_lib/status.ts` holds status maps, step flow
  and countdown helpers.
- **`app/orders/[id]/` (many small cards).** 1709 -> ~145 lines. `_lib/derive.ts`
  computes ~15 derived flags/dates once; each card **self-gates** (returns `null`), so
  `index.tsx` is a flat list of `<Order*Card>`s. Related tiny cards share a file
  (`OrderInfoCards`, `OrderActionCards`, `OrderInvoiceCards`). `useOrderActions` is
  the controller; `useOrderInvoices` owns the invoice queries + downloads.
- **`app/(tabs)/index.tsx` (display-heavy).** 1774 -> ~103 lines. The ~890-line
  `StyleSheet` moved **verbatim** to `_lib/styles.ts` and is shared by every section
  (a route-local stylesheet is the one exception to per-component styles: re-typing a
  cohesive sheet is transcription risk). Focused query hooks (`useHomeData`,
  `useHomeBadges`, `useHomeGuestPrompt`), navigation in `_lib/nav.ts`, self-gating
  section components.
- **`app/checkout/` (payment flow).** 1376 -> ~105 lines. The payment-critical logic
  (`proceedCheckout`, guest OTP, validation, payload builders) was **lifted verbatim**
  into one controller hook (`useCheckout`), a lift and never a rewrite; the screen
  composes `Step1Address` / `Step2Payment` / `Step3Confirm`, `CheckoutProgress`,
  `OrderSummary`, `AddressSelector`, `OtpModal`. When a flow is this risky, prefer one
  big verbatim controller over clever re-decomposition.

## Shells

Shells are mandatory; the `screenShells` jest scan checks every `app/**` screen.

- **Tab roots use `AppShell`** (`@/components/shell/AppShell`), the same bar on every
  tab root: left button `squares-2x2` -> `/categories` (empty on the Profile root,
  `leading="none"`), a search field or title, then exactly two right icons with unread
  badges (messages, notifications); no cart, no logo. The Profile root alone has one
  Settings button instead (`actions="settings"` -> `/settings`).
- There is no side menu. Profile lists the user's activity, `/settings` the account
  and app settings; one menu model (see `src/components/CLAUDE.md` › Menu).
- The bottom menu is the fixed pill `AppTabBar`: five items, Home, Favorites, "+"
  (İlan Ver / Sell, in the centre), Cart, Profile. It never collapses or shrinks on
  scroll. Tab-root lists add `useTabBarInset()` as bottom padding. Phones: the window
  minus the side gaps; tablets: a centred floating pill capped at `TAB_BAR_MAX_WIDTH`.
  Messages and Notifications are stack routes without the bar.
- **Stack screens with the bar** wrap their default export in `withStackTabBar`
  (`@/components/shell/StackTabBar`): category, search, manufacturer / brand products
  (`EntityProductsScreen`) and model detail. The list binds `usePageScrollHandler()`
  like any list page (`PageShell scroll={page}`) and adds `useTabBarInset()` as bottom
  padding. A floating button on such a screen sits above the bar (`useTabBarTop()`),
  never over it. The bar hides while the keyboard is open (`TabBarView`). A tap uses
  `router.dismissTo` back to the tabs underneath.
- **Stack screens use `PageShell`** (`@/components/common/PageShell`): floating glass
  top bar, back arrow, centred title, optional right action, optional fixed bottom
  bar, keyboard + safe area, `loading` / `empty` / `error` + `onRetry`. `loading` and
  `error` **unmount `children`**, so modals and sheets go in the always-rendered
  `overlay` prop.
- Inside content: `PageHeader` for the title band, `SectionCard` (+
  `SectionCardAction` "Tümünü gör ›") for sections. Never hand-roll a header or a
  bordered section.
- Reference screens: `app/(tabs)/messages` (tab root), `app/settings/addresses`
  (list), `app/settings/edit-profile` (form). `/tasarim` is the component showcase.

## Top bar

- `ScreenHeader` floats (`position: absolute`, content slides under it) and has no
  background. Back arrow = `GlassIconButton`; right actions = `TopBarAction` (icon ->
  `GlassIconButton`, text -> `GlassSurface` pill, display-only -> `TopBarLabel`).
  iOS 26 real Liquid Glass; iOS < 26 translucent white + hairline + shadow; Android
  translucent/opaque white + elevation (no blur).
- One formula everywhere: safe-area top from `useHeaderTopInset()` (`@/ui`, the only
  source; never `insets.top`, never `SafeAreaView edges` with `'top'`) + fixed
  `theme.headerHeight` (52); `useHeaderBarInset()` = both.
- Title is **centred**, `Text` h3 bold, one line with ellipsis; both side slots are
  reserved at equal width. Back = `chevron-left` 24, heading colour, on a 44 pt glass
  circle. Never put `colors.white` / `variant="primary"` content in the bar.
- Custom title (chat avatar + name)? Use the `titleSlot` / `leading` / `right` slots.
  `floating={false}` (opaque, in-flow) is only for custom shells (chat header with
  banner, payment, WebView, gates). Home (`AppShell variant="search"`) has its own bar.
- Screens that still draw their own orange header (search, ...) are being moved onto
  the shells; never add a new one.
- Enforced by `tarodan/no-custom-screen-header` and `tarodan/no-native-header`
  (warnings; exempt files are listed inside the rules).

## Scroll edge

- A `ScrollEdge` (fading translucent white gradient over the status bar) fades in
  with scroll offset (0 -> none, 24 pt -> full).
- `PageShell` binds its own ScrollView (`mode="scroll"`). A screen with its own list
  (`mode="list" | "static"`, `AppShell variant="title"`) opts in:
  `const page = usePageScrollHandler()` -> `<PageShell scroll={page}>` +
  `<Animated.FlatList {...page.listProps} contentContainerStyle={page.contentStyle(base)} />`
  (iOS gets `contentInset`, Android `paddingTop`; `page.topInset` for `RefreshControl`
  `progressViewOffset`).
- Tab roots feed the shell's value with ONE handler (never two `onScroll`s):

  ```tsx
  const page = usePageScrollValue();
  const onPageScroll = usePageOffsetHandler(page.scrollY); // home: + its hero offset bridge
  // <AppShell variant="title" scroll={page}> + <Animated.ScrollView onScroll={onPageScroll} />
  ```

- Home binds the same edge (`<AppShell scroll={page}>`); product detail uses the same
  `ScrollEdge` + bar metrics, timed to complete when the gallery's end reaches the bar.
- Unbound screens (and every screen while loading/empty/error) draw no edge: the body
  starts below the bar, so at rest every bar looks the same. Never add manual top
  padding for the bar: the shell / `contentStyle` already adds `inset + headerHeight`.

## Navigation

- Going to a tab root from a stack screen, push, ad or deep link uses `navigateTo()`
  (`@/lib/navigation/goTo`, `router.dismissTo`); never `router.push('/(tabs)/...')`,
  which stacks a second `(tabs)`.
- Back with no history -> `goBackOrHome()` (`router.replace('/(tabs)')`); the arrow is
  never dead.
- Stack layouts spread `stackScreenOptions` (`@/lib/navigation/screenOptions`: no
  native header, `slide_from_right`). `headerShown: true` is banned.
