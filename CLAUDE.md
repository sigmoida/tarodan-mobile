# Mobile — UI & Architecture Principles

Guidance for building this app (Expo + expo-router, repo root) — the native
marketplace client. Read this before adding routes, screens, components, or
hooks. It is the **native mirror** of the web app's `apps/web/CLAUDE.md` (in the
separate `tarodan-app` repo): same "thin screens, logic in hooks", same single
server-state, same design-token and DRY discipline — adapted from Next.js App
Router to expo-router and from `@tarodan/ui` to `@tarodan/ui-native`. When a rule
isn't native-specific, it means "same as web".

**Visual reference = the web app at phone width (< 640px).** Sizes, colour roles,
copy, ordering and states come from there (§14). Native-only deviations are
limited to platform idioms: bottom tab bar, native stack + back arrow, bottom
sheets, infinite scroll, pull-to-refresh, safe areas.

Web → mobile mapping:

| Web (`tarodan-app/apps/web`)         | Mobile (this repo)                           |
| ------------------------------------ | -------------------------------------------- |
| `@tarodan/ui`                        | `@/ui` (vendored `@tarodan/ui-native`)       |
| `@tarodan/ui/form` (RHF+zod)         | `@/ui/form` (vendored; `useZodForm`)         |
| App Router route groups + `_folders` | expo-router route groups + `_folders`        |
| Server Components / `generateMetadata` | (drops — native has no SSR/SEO)            |
| TanStack Query + `lib/api/*` by domain | **same** (`src/lib/query`, `src/lib/api/*`) |
| Tailwind semantic token classes      | `@/theme` (re-exported via `@/ui`)           |

**Note:** `@tarodan/*` packages are vendored into this standalone repo under `src/` — there are no external package dependencies. Import from `@/ui` and `@/theme` (aliased to `src/ui` and `src/theme`).

## 1. Base components come from `@tarodan/ui-native`

Never rebuild a primitive that already exists (`Input`, `Textarea`, `Checkbox`,
`Switch`, `Card`, `Badge`, `Alert`, `Modal`, `Spinner`, `Avatar`, `StatusBadge`,
`Stack`/`VStack`/`HStack`, `Divider`, `ProgressBar`, `EmptyState`, `ErrorState`).
Import from `@/ui` (vendored `@tarodan/ui-native`; source lives in `src/ui`).

- Need a variant/state that doesn't exist? Add it to `@tarodan/ui-native`
  (shared), don't fork a local copy.
- Marketplace composites built _from_ primitives (`ProductCard`, `ListingRow`, …)
  live in `src/components/<feature>/`, not at the components root.

## 2. Everything flows from design tokens

Colors, spacing, radius, and typography come from the `theme` export, re-exported
from `@/ui` (`@/theme` only exports the raw tokens — there is no `theme` export
there):

```ts
import { theme } from '@/ui';
const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface.DEFAULT, padding: theme.spacing[4],
          borderRadius: theme.radius.lg },
});
```

- `spacing` keys are **numeric**, not named (`theme.spacing[4]` = 16pt, `[2]` = 8pt,
  `[1]` = 4pt — there is no `spacing.md`/`spacing.sm`/`spacing.xs`). `radius` keys
  (`sm`, `DEFAULT`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`) and top-level `colors`
  keys (`primary`, `danger`, `success`, `info`, `warning`, `gray`, `text`, `surface`,
  `border`, `white`, `black`, `transparent` — no `background`) are real; confirm
  exact names in `src/theme/` before using one you haven't seen in surrounding code.
- **No hardcoded hex / rgba** in screens or components. Need a translucent
  overlay? Use `theme.colors.overlay.*`, not a raw `rgba(...)`.
- The old hardcoded `TarodanColors` palette is **gone** (`src/theme/catalog.ts`
  now only holds data constants). `src/theme/colors.ts` is the raw token source —
  screens read it through `theme.colors.*` from `@/ui`, never by importing the
  file or re-declaring a hex.
- **Role tokens live in `src/theme/roles.ts`** (re-exported as `theme.*`): `iconSize`
  (16/20/24), `controlHeight` (32/40/48/56), `minTouchTarget` (44), `radiusRole`
  (product card 4; card/section/button/input/badge 6; modal 8; chip/avatar full),
  `priceColor`, `counterBadgeColor` (danger-500), `theme.shadow`, `theme.duration`
  (150/250/400). Use a role, not a raw number (`fontSize: 13`, `borderRadius: 12`
  are off-scale and lint-warned).

## 3. One screen = one concern (route groups)

Separate concerns with **route groups** (`(auth)`, `(tabs)`, …), each with its
own `_layout.tsx`. A screen that swaps between two distinct flows via a mode flag
should be **two routes**. There is no SSR/metadata story here — that web rule
drops entirely.

## 4. Thin screens, logic in hooks

A screen (`index.tsx`) should mostly **compose**: call its hooks, render its
sections and modals. Target **< ~150 lines**. Data-fetching, mutations, form
submission, and side effects live in colocated `_hooks/`. Business logic /
status maps / schemas live in `_lib/`. If a screen is 1000+ lines it is doing
too much — split it (see §9).

## 5. DRY — never duplicate

If you're about to copy a block, extract it (component, hook, or constant).
Duplicated config (status maps, filter tabs, labels) is the most dangerous kind —
it drifts silently. Keep **one source of truth** in `_lib/status.ts` (route-local)
or a shared package. Query keys have a single source: `@/lib/query` (§7).

## 6. Data & fetching — one discipline (TanStack Query)

**Never** `useState` + `useEffect` + `api` by hand, and **never** fetch inside a
zustand store. React Query is the **single server-state**.

- **Lists / reads** → a **query hook** in the route's `_hooks/`
  (`useXxx.ts` → `{ data, isLoading, ... }`). It owns the `queryKey` (from the
  central registry) and `queryFn` (calling `@/lib/api/*`).
- **Writes** → a **mutation hook** (`useDoXxx.ts`) that owns the snackbar/toast +
  `invalidateQueries`. This is the **only** way to mutate — so lists refresh
  automatically, no manual `refetch()`.
- **Deliberate exception — file upload queue.** Per-file progress/cancel/retry uploads
  (listing images) run outside a React Query mutation: image preparation (resize/compress,
  serial gate, timeout, abort, temp-file cleanup, `pickerQuality()`) lives in `src/lib/media`,
  the multipart part (`appendRNFile`, iOS URI rule) in `src/lib/api/formData.ts`, the queue in
  the feature (`src/components/listing/_lib/uploadQueue.ts`). Every photo upload goes through
  `src/lib/media` first; all other writes are still mutation hooks.
- Every dialog/modal is its **own** component in `_modals/`, owning its
  `useZodForm` + zod schema + mutation. The screen holds only open/close state.

### Query keys — central registry
All `queryKey`s come from `@/lib/query` (`qk.<domain>.detail(id)`, `qk.products.all`).
Never hand-write `['product', id]` inline — that is how `my-collections` vs
`myCollections` drift crept in. Add new keys to `src/lib/query/keys.ts`.

### The API layer
`src/lib/api/*` is the axios surface, **split by domain** (`auth`, `products`,
`catalog`, `orders`, `checkout`, `membership`, `messaging`, `trades`, `user`,
`media`) behind a thin `client.ts` (axios instance + interceptors). Import domain
APIs from `@/lib/api`. (`src/services/api.ts` is a backward-compat barrel that
re-exports `@/lib/api`; new code imports from `@/lib/api` directly.)

## 7. Forms — one abstraction (`@/ui/form`)

All forms use `useZodForm` + `Form`/`FormInput`/`FormError` from
`@/ui/form` (vendored `@tarodan/ui-native/form`). **No manual `useState`-per-field forms.** Colocate the
zod schema in the route's `_lib/schema.ts`.

```ts
import { useZodForm, Form, FormInput } from '@/ui/form';
import { offerSchema } from './_lib/schema';
const form = useZodForm(offerSchema);
```

## 8. State (zustand) is client/UI-only

Stores hold **only client/UI state** (auth token, cart, filters, drafts). A store
must **never fetch** — server data belongs in React Query. (Migrating
`favoritesStore`/`messagesStore` fetches to query hooks is Faz 1.)

## 9. Folder shape per route (mirror web)

**expo-router does NOT hide `_` folders by itself** — it treats every `.ts/.tsx`
under `app/` as a route (only `+api`/`+html`/`+middleware` are skipped). This repo
hides them with `patches/expo-router@6.0.24.patch` (pnpm `patchedDependencies`):
any path segment starting with `_` (`_hooks/`, `_lib/`, `__tests__/`, `_foo.tsx`,
and everything inside a `_` folder) is excluded from the route scan and typed
routes; only files named `_layout` / `_sitemap` (+ optional `.ios/.android/.native/.web`)
stay routes. `__tests__` is additionally kept out of the bundle by Metro's default
`blockList`.

- `expo-router` is pinned to the **exact** version in `package.json` (no `~`) — the
  patch key is version-bound; a silent bump fails install (`ERR_PNPM_UNUSED_PATCH`).
- `patches/**` is in `.fingerprintignore` (the patch is JS-only, so it must not
  change `runtimeVersion` / break OTA). A patch that touches native code must
  narrow that line.
- Guarded by `__tests__/routerPrivateFolders.test.ts` (reads the regexes from
  `node_modules`, so a lost patch fails it). **On any expo-router upgrade** re-create
  the patch for the new version (`pnpm patch expo-router@<new>`) and run that test.

Current Expo practice is to keep non-route code out of `app/`: for new features put
shared / non-route code under `src/`; small route-specific helpers may stay in
colocated `_` folders (thanks to the patch). Never name a route file
`_something.tsx` — it would not be a route.

```
app/<group>/<route>/
  index.tsx        # THIN screen: hooks + sections + modals composition (< ~150 lines)
  _lib/
    types.ts       # route DTO types
    schema.ts      # zod schema (colocated)
    status.ts      # status map / filter tabs / labels (single source)
  _hooks/
    useXxx.ts      # query hook → { data, isLoading }
    useDoXxx.ts    # mutation hook (snackbar + invalidateQueries owner)
  _sections/       # large screen sections / steps
  _components/     # route-local cards / rows
  _modals/         # dialogs; each owns its useZodForm + mutation
  [id]/            # dynamic segment; same shape
```

Shared, cross-route code:

```
src/
  lib/
    query/ { client.ts, keys.ts }   # QueryClient + central query-key registry
    api/   { client.ts, <domain>.ts } # axios surface split by domain
  hooks/     # ONLY cross-route hooks
  stores/    # zustand: client/UI state only (NO fetch)
  components/ { <feature>/ }
```

## 10. Imports — use the `@/` alias

Use `@/…` (→ `src/…`) instead of brittle `../../../src/…`. Metro (Expo SDK 54)
resolves tsconfig `paths` at runtime; jest maps `@/` in `jest.config.js`. Prefer
`@/lib/api`, `@/lib/query`, `@/components/...` over deep relative paths.

## 11. Loading / empty / error states

Use the shared `Spinner`/`ScreenLoader`, `EmptyState`, and `ErrorState` primitives
consistently — don't hand-roll per-screen loaders or empty views.

## 12. Canonical example — `app/offers/`

The offers screen is the **reference implementation** of this whole doc — copy its
shape when splitting any bloated screen. It went from one 1179-line file to a
< ~130-line `index.tsx` that only composes:

```
app/offers/
  index.tsx                 # THIN: hooks + <OffersTabs/> + <FlatList><OfferCard/></> + modals
  _lib/
    types.ts                # Offer / TabType / OfferStatus DTOs
    status.ts               # STATUS_CONFIG + formatPrice/getTimeRemaining/... (single source)
    schema.ts               # sellerCounterSchema / buyerCounterSchema (zod factories, dynamic bounds)
  _hooks/
    useOffers.ts            # query hook → list by tab (qk.offers.list)
    useCommissionPreview.ts # query hook → net-estimate map (replaces a useEffect+fetch)
    useOfferActions.ts      # accept/reject/cancel mutations (owns appAlert + invalidate)
    useDoCounterOffer.ts    # mutation, owned by CounterOfferModal
    useDoBuyerCounter.ts    # mutation, owned by BuyerCounterModal
    useInvalidateOffers.ts  # shared invalidation set (DRY — one source)
  _components/
    OffersAuthGate.tsx  OffersTabs.tsx  OffersEmpty.tsx  OfferCard.tsx
  _modals/
    CounterOfferModal.tsx   # owns its useZodForm + schema + mutation
    BuyerCounterModal.tsx
```

Patterns to copy:
- **Query hooks own the `queryKey`** (from `qk`) + `queryFn` (from `@/lib/api`); the
  screen never calls `api` or writes a key inline.
- **Mutation hooks own `appAlert` + `invalidateQueries`** — no manual `refetch()`.
  Per-item spinner comes from `mutation.variables` (`pendingOfferId`), not a
  `useState`.
- **Modals own their form + mutation**; the screen holds only `useState<Offer | null>`
  open/close state.
- **⚠️ Close the modal _before_ the mutation fires** — a mutation's `appAlert`
  (success or error) while a `ui-native` Modal is open freezes iOS. See §1 note and
  the `onSubmit` in `CounterOfferModal`.
- All feedback strings, status colors, and formatting live in `_lib/status.ts`, not
  scattered in JSX.

**Second worked example — `app/product/[id]/` (heavy screen).** Same shape applied
to a 1530-line screen (→ ~215-line `index.tsx`): query hooks with side effects
(`useProduct` owns the view-count POST + list invalidation), a `useProductActions`
hook that centralizes the snackbar + every handler (cart/offer/trade/report/share),
and presentational `_components` (`ProductInfo`, `SellerCard`, `ProductBottomBar`,
`ProductGallery`, …). Note two patterns for scale: hooks are called
**unconditionally before** the `isLoading` / not-found early returns (never
conditionally), and `useProductActions` accepts a nullable product with guarded
handlers so the hook order is stable while the screen is still loading. A
route-local loose `Product` DTO (`_lib/types.ts`) with an index signature keeps the
gradual `any` migration (Faz 4) from blocking the split.

**Third worked example — `app/trade/[id]/` (status machine).** The 1830-line trade
detail (→ ~170-line `index.tsx`) shows the pattern on a status-driven screen: a
single `useTradeActions` controller hook owns all 6 mutations + snackbar + both
modals' UI state; a pure `_lib/derive.ts` computes every derived value (party,
totals, shipment selectors, cash) once so JSX never re-derives; and the huge
status-conditional JSX splits into `TradeStatusHeader` / `TradeShippingSection` /
`TradeActions` etc., each rendering `null` when its status branch is inactive.
`_lib/status.ts` is the single source for the status maps, step flow, and countdown
helpers. `[id].tsx` became the folder `[id]/index.tsx` (expo-router resolves the
directory) — colocated tests importing `../[id]` keep working.

**Fourth worked example — `app/orders/[id]/` (many small cards + derived-heavy).**
The 1709-line order detail (→ ~145-line `index.tsx`) shows the pattern when a screen
is a long stack of small status-gated cards. A pure `_lib/derive.ts` computes the
~15 derived booleans/dates (isPaid, isPostShipment, isCancelled, showTrackingCard,
payoutReleaseDate, isPastRefundWindow, …) once; each presentational card
**self-gates** (returns `null` when its condition is false) so `index.tsx` is a flat
list of `<Order*Card>`s with no inline conditionals. Related tiny cards are grouped
per file (`OrderInfoCards`, `OrderActionCards`, `OrderInvoiceCards`) rather than one
file each. `useOrderActions` is the controller (refund/cancel/pay mutations + refund
modal form state + evidence picker + snackbar); `useOrderInvoices` owns the two
invoice queries + download handlers.

**Fifth worked example — `app/(tabs)/index.tsx` (display-heavy, huge stylesheet).**
The 1774-line home screen (→ ~103-line `index.tsx`) is display-only (8 queries, no
mutations, many sections). Two techniques for this shape: (1) the ~890-line
`StyleSheet` was moved **verbatim** to `_lib/styles.ts` and imported by every
section (a shared route-local stylesheet — the one place we don't colocate styles
per-component, because it's a single cohesive sheet and re-typing it per section
is pure transcription risk); (2) data lives in focused query hooks (`useHomeData`
= the 6 content queries, `useHomeBadges` = cart/fav/msg/notif counts + store
effects, `useHomeGuestPrompt`), navigation in `_lib/nav.ts`, and the JSX splits
into section components (`HomeHeader`, `HomeSections` exporting Hero/Categories/
Brands/Scales/FeaturedCollector/BoostedRail/PopularProducts/ProductsGrid/
Collections, plus `CompanyOfWeekSection`), each self-gating on its data.

**Sixth worked example — `app/checkout/` (multi-step form, payment flow).** The
1376-line checkout (→ ~105-line `index.tsx`) is a 3-step guest/auth checkout with
OTP, idempotency, and a delicate PayTR/bypass/stockout branch. The key discipline:
the payment-critical logic (`proceedCheckout`, guest-OTP, validation, payload
builders) was **extracted verbatim** into one controller hook (`useCheckout`) — a
lift, never a rewrite — and the screen just composes step sections
(`Step1Address`/`Step2Payment`/`Step3Confirm`), `CheckoutProgress`, `OrderSummary`,
`AddressSelector`, `OtpModal`. Pure helpers live in `_lib/{validation,constants,
types}`. When a flow is this risky, prefer one big verbatim controller hook over
clever re-decomposition of the logic itself.

## 13. Verification

Run from the repo root (this is a standalone repo — no `pnpm --filter`):

- `npx tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (hex/rgba, raw manual forms where `useZodForm` fits, …).
  Design-discipline rules (§14) are currently **warnings**; do not add new ones.
- `pnpm test --maxWorkers=2 <paths>` green for touched routes/modules. Run only the
  relevant tests (16 GB machines, parallel agents); the full suite runs at the end/CI.
- Exercise the changed flow in the app (Metro) — behavior unchanged.

## 14. Design discipline (web at phone width is the reference)

Binding for every screen and component. Mostly enforced by lint (`.eslintrc.cjs`,
local rules in `eslint-plugin-tarodan/`) — today as **warnings**; wave 2 clears them
and turns them into **errors**, so write new code warning-free.

- **Shells are mandatory.** Tab roots use `AppShell` (`@/components/shell/AppShell` — the same
  bar on EVERY tab root: [left button: `squares-2x2` → `/categories`; EMPTY on the Profile root (`leading="none"`)][search field or title][messages][notifications] — exactly two
  right-side icons with unread badges, no cart, no logo; the Profile root alone has ONE ⚙️ Settings button instead
  (`actions="settings"` → `/settings`)). There is NO side menu: the Profile tab lists the user's activity
  (Shopping · Finance · Collection · Analytics) and `/settings` the account/app settings (Account · Payments & Bank ·
  Membership · Preferences · Help & Support · Info & Legal + logout) — one menu model, `src/lib/menu/profileMenu.ts`
  (`surface: 'profile' | 'settings'`), each group a white `SectionCard` (`MenuGroupList`). The bottom menu is a floating pill
  (`AppTabBar`; Home, Favorites, Cart, Profile + the separate "+" sell button); tab-root
  lists/ScrollViews add `useTabBarInset()` as bottom padding so content never hides under it.
  Messages and Notifications are stack routes (`/messages`, `/notifications`) opened from the header.
  Navigating to a tab
  root from a stack screen / push / ad / deep link goes through `navigateTo()`
  (`@/lib/navigation/goTo`, `router.dismissTo`) — never `router.push('/(tabs)/…')`, which stacks a
  second `(tabs)`. Search is a stack route (`/search`). Stack screens use
  `PageShell` (`@/components/common/PageShell` — floating glass top bar with back arrow,
  centred title, optional right action, optional fixed bottom bar, keyboard + safe area, and
  `loading` / `empty` / `error` + `onRetry` states; `loading`/`error` **unmount `children`**,
  so modals and sheets go in the always-rendered `overlay` prop — an open form
  modal inside `children` would lose its input). Inside content use `PageHeader`
  for the page title band and `SectionCard` (+ `SectionCardAction` "Tümünü gör ›") for
  sections. Don't hand-roll a header or a bordered section. Reference screens to copy:
  `app/(tabs)/messages` (tab root), `app/settings/addresses` (list),
  `app/settings/edit-profile` (form). `/tasarim` is the dev/staging component showcase.
- **Top bar floats and has no background.** `ScreenHeader` is `position: absolute` over the
  content (content slides under it): back arrow = `GlassIconButton` (glass circle), right-side
  actions = `TopBarAction` (icon → `GlassIconButton`; text → `GlassSurface` pill; display-only
  values → `TopBarLabel`). iOS 26 real Liquid Glass, iOS < 26 translucent white + hairline +
  shadow, Android translucent/opaque white + elevation (no blur). The **title is CENTRED**
  (h3 bold, one line, ellipsis); the two side slots are reserved at equal width so it stays truly
  centred (no back arrow → left slot stays empty). Never put `colors.white` / `variant="primary"`
  content in it. Screens that still draw their own orange header (search, …) are being moved onto
  the shells; don't add new ones. Home (`AppShell variant="search"`) has its own floating bar.
- **Scroll edge.** Under the bar a `ScrollEdge` (top-to-bottom fading translucent white
  gradient, covers the status-bar region) fades in with scroll offset (0 → none, 24pt → full).
  `PageShell` binds its OWN ScrollView automatically (`mode="scroll"`, nothing to do). A screen that
  draws its own list (`mode="list"|"static"`, `AppShell variant="title"`) opts in:
  `const page = usePageScrollHandler()` → `<PageShell scroll={page}>` +
  `<Animated.FlatList {...page.listProps} contentContainerStyle={page.contentStyle(base)} />`
  (iOS gets `contentInset`, Android `paddingTop`; `page.topInset` for `RefreshControl`
  `progressViewOffset`). Tab roots feed the same signal from the tab-bar handler — ONE handler,
  never two `onScroll`s: `const page = usePageScrollValue(); const tabScroll =
  useTabBarScrollHandler(undefined, page.scrollY);` → `<AppShell variant="title" scroll={page}>`.
  An unbound screen (and every screen while `loading` / `empty` / `error`) draws NO edge: the body
  starts below the bar, so at rest every bar looks the same (no background). Home binds the same
  edge (`<AppShell scroll={page}>`); product detail uses the same `ScrollEdge` + bar metrics, timed
  to complete when the gallery's end reaches the bar. Don't add manual top padding for the bar — the shell/`contentStyle` already
  adds `inset + headerHeight` (no double gap). `floating={false}` (opaque, in-flow) exists only for
  custom shells (chat header with banner, payment, WebView, gates).
- **One top bar, one inset formula.** Bar height, title position and back arrow are identical on
  every screen: `ScreenHeader`/`PageShell` = safe-area top (`useHeaderTopInset()` from `@/ui`, the
  only source — never read `insets.top`, never `SafeAreaView edges` with `'top'`) + fixed
  `theme.headerHeight` (52) content (`useHeaderBarInset()` = both), centred single-line title
  (`Text` h3 bold), `chevron-left` 24 heading-colour arrow on a 44pt glass circle. Need a custom
  title (chat avatar+name)? use the
  `titleSlot`/`leading`/`right` slots, not a hand-drawn bar. Back with no history →
  `goBackOrHome()` (`router.replace('/(tabs)')`), the arrow is never dead. Modal/sheet titles are
  `SheetHeader` (title left, close right, same height; `fullScreen` adds the Android top inset —
  pair it with `statusBarTranslucent`). Stack layouts spread `stackScreenOptions`
  (`@/lib/navigation/screenOptions`: no native header, `slide_from_right`). Enforced by
  `tarodan/no-custom-screen-header` + `tarodan/no-native-header` (warnings; exempt files are listed
  inside the rule) and the `screenShells` jest scan (every `app/**` screen contains a shell).
- **Icons carry function only:** back, close, search, cart, favourite, share, menu,
  filter, status icons, and icons the web shows in the same place. Decorative icons
  (in titles, list-row leading, inside buttons, section heads) are removed; an icon
  the web doesn't have is removed by default.
- **Feedback:** info/success → `toast` / `toast.success` (`@/ui`, web react-hot-toast
  equivalent; `Snackbar` was removed and its `@/ui` import is lint-banned). Anything that needs confirmation, or an error the user must act on →
  `appAlert` dialog. Yes/no confirmation → `if (!(await confirm({ title, message, destructive })))
  return;` (`@/ui`, web ConfirmProvider signature; resolves after the dialog has closed, so a
  following toast/navigation/modal is iOS-safe). Toasts draw in the topmost layer (`ToastLayer`
  inside `@/ui` `Modal`, `AlertDialog`, `BottomSheet`), so they are visible over open dialogs/sheets
  and sit above the keyboard / tab bar / `PageShell` footer (`useToastBottomInset`, focus-scoped).
  `appAlert` buttons: two buttons that fit sit side by side with `cancel` on the LEFT; stacked
  (labels don't fit, or 3+ buttons) the `cancel`-styled button is at the BOTTOM; the others keep
  the caller's order (never reversed). `cancelable` defaults to `true` when there is a `cancel`
  button or a single button (Android back / backdrop = pressing that button); pass
  `cancelable: false` for alerts the user must read (payment uncertainty).
- **Bottom sheets: one primitive family.** Everything that slides up from the bottom is
  `BottomSheet` / `SelectSheet` / `ActionSheet` (`@/ui`) — never a sheet hand-built on a raw RN
  `Modal`. `BottomSheet` owns grabber + `SheetHeader`, drag-to-close, Android back, the fixed
  safe-area/keyboard-aware `footer` (buttons via `ButtonRow`) and `size="fit" | "large"`; pick
  lists = `SelectSheet` (search, single/multi), menus = `ActionSheet` (never `appAlert` buttons).
  A follow-up native presentation (appAlert, another modal, picker) runs **after** the sheet has
  closed: `onClosed` / `useBottomSheet().runAfterClose(fn)` (ActionSheet rows do this). A
  multi-field form is a separate screen (`PageShell`), not a sheet.
- **Modals never wait for a mutation.** `ModalFooter` has no `isLoading` on purpose (§12
  iOS freeze): validate, `onClose()` first, then fire the mutation; progress/result goes to
  a toast or the list state. Don't hold a modal open on `isPending`.
- **Typography:** Noto Sans 400/500/600/700, same as web. The weight→font-file
  mapping and the -0.01em body letter-spacing live in **one place**,
  `src/theme/typography.ts` (`brandFontStyle`); loading is `useFonts` in
  `app/_layout.tsx`. Never set `fontFamily` per screen. Use `Text` variants; `RawText`
  is a **temporary** drop-in for legacy raw RN `Text` — don't use it in new code.
- **No raw RN `Text` / `TouchableOpacity` / `Modal`** (import from `@/ui`), no raw
  `TextInput` (use `Input`), no off-scale numeric `fontSize` / `fontWeight` /
  `borderRadius` / `lineHeight` in `StyleSheet` (use `theme.typography` / `radiusRole`).
- **Price:** only `formatPrice` (`src/utils/format.ts`) or the `ProductPrice` component
  (`@/components/product`) → "1.234,50 TL". Never a `₺` literal; a discounted price
  shows the old one struck through.
- **Status:** colour + label only from the web-identical maps in `src/lib/shared`
  (`status-configs.ts`, `useStatusConfig`). Never a local status map in a screen.
- **One product card.** Every product tile is `ProductCard` (`@/components/product`; grid + list,
  mirrors web `ProductCard` at phone width) — never a local card. Lists use `ProductGrid`
  (skeleton → single empty state → error), sort via `ProductSortModal`, active filters via
  `ActiveFilterChips`; collection tiles are `CollectionCard` (`@/components/collection`). Cards carry
  a favourite heart (decided for web + mobile together): small glass circle (`GlassIconButton
  size="sm"`, 32pt, 44pt hitSlop) at the image's bottom-right, outline / solid `danger-500`, drawn as a
  sibling of the card `Pressable` (tapping it never opens the product). Wire it once per list with
  `useProductCardFavorites()` (`@/hooks/useFavoriteToggle`) → `<ProductCard {...favoriteProps(p)} />`
  (`ProductGrid` does it itself); it hides the heart on the user's own listing and sends guests to
  sign-in. Detail and card share `useFavoriteToggle` (one toggle flow, one favorites cache). Still no
  "in cart" pill on cards (web has none).
- **Tap targets ≥ 44pt** — visuals may stay at the web size, close the gap with
  `hitSlop` (Button/IconButton/Chip already do).
- **Press feedback:** Android = `android_ripple`, iOS = the existing pressed opacity — both from
  `@/ui` `androidRipple()` / `rippleClip()` / `showPressedStyle()` (`src/ui/lib/pressableFeedback.ts`);
  core primitives already do it, a new custom `Pressable` uses the same helper (no local ripple config).
- **Dynamic type:** `maxFontSizeMultiplier` comes from `theme.typography.maxFontScale` (body 1.35 /
  heading 1.25 / control 1.2) — `Text`/`RawText`/`RawTextInput` default it per role (no global
  `defaultProps`); fixed-height controls use `minHeight` + vertical padding, never a hard `height`.
- **Empty states:** every empty screen/list/section uses `EmptyState` (`@/ui`) — `icon`, `title`
  and `subtitle` are **required**, the action is optional. Placement is one rule built into the
  component (`placement="screen"`, the default: fixed `EMPTY_STATE_TOP_OFFSET` from the top of the
  content area, centred horizontally, no vertical centring), so `PageShell` `empty` and a screen's
  main `ListEmptyComponent` sit in the same place. Empties **inside a card, modal or section**
  (and the vertically-centred gate screens) pass `placement="inline"` (compact: 24pt top, 8pt
  bottom, 48pt circle) — `ErrorState` takes the same prop. Give each `EmptyState` a unique
  `testID` when several can render on one screen (default `empty-state` / `error-state`); never wrap it in extra padding/margin or hand-draw View + icon + Text
  (`tarodan/empty-state-standard` warns on hand-drawn `ListEmptyComponent`s).
- **Loading:** list and card screens use `Skeleton*` (web-like); a full-screen
  spinner only for the very first load.
- **Copy:** same i18n key, same value as web. New keys go into both `tr` and `en`
  (prefer the web's key name and text), then `node scripts/gen-keys.mjs`; don't
  rewrite existing catalog values as a side effect of a UI change.
