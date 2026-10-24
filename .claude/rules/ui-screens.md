---
paths:
  - "app/**"
  - "src/components/**"
---

# Screen and component rules (digest)

Cross-cutting rules for every screen and feature component. Each line points to the
full section; read it before deviating. Web at phone width is the reference.

- **Feedback:** info/success -> `toast` / `toast.success`; an error the user must act
  on -> `appAlert`; yes/no -> `await confirm({ title, message, destructive })`. RN
  `Alert` and `Snackbar` are banned. See `src/ui/CLAUDE.md` › Feedback.
- **iOS modal rule:** close a modal **before** firing its mutation; never hold it open
  on `isPending`; run follow-up presentations (appAlert, navigation, pickers) after
  a sheet closes (`runAfterClose` / `onClosed`). See `src/ui/CLAUDE.md` › iOS modal
  rule.
- **No raw RN components:** no `Text`, `TextInput`, `TouchableOpacity`, `Modal` or
  `ActivityIndicator` from `react-native`; use `@/ui`. No hex/rgba or off-scale
  numbers; use `theme` from `@/ui`. See `src/ui/CLAUDE.md` › Raw components and
  `src/theme/CLAUDE.md` › Using tokens.
- **Price:** only `formatPrice` or `ProductPrice`; never a `₺` literal; amounts come
  from the server. See `src/components/CLAUDE.md` › Price.
- **Status:** colour + label only from the maps in `src/lib/shared`; never a local
  status map. See `src/components/CLAUDE.md` › Status.
- **Product tiles:** always `ProductCard`; lists use `ProductGrid`; favourites via
  `useProductCardFavorites()`. See `src/components/CLAUDE.md` › Product card.
- **Empty and error:** `EmptyState` (icon + title + subtitle required) and
  `ErrorState` with retry; `placement="list"` in the `ListEmptyComponent` of a
  `pageListContentStyle` list, `placement="inline"` inside cards, modals and
  sections. See `src/ui/CLAUDE.md` › Empty and error states.
- **Loading:** skeletons for lists and cards, `ScreenLoader` only for first load or
  layout-less flows, one `LoadingIndicator`, `useDelayedLoading`. See
  `src/ui/CLAUDE.md` › Loading.
- **Sheets:** everything that slides up is `BottomSheet` / `SelectSheet` /
  `ActionSheet`; a multi-field form is a screen, not a sheet. See `src/ui/CLAUDE.md`
  › Bottom sheets.
- **Large screens:** edge to edge on every width, no centred narrow column; the gutter
  is `pageGutter` (`usePageContentStyle` on a list's content), row lists use
  `useRowGrid`, card grids `useGridColumns`, wider classes re-proportion into panes. See
  `src/ui/CLAUDE.md` › Large screens.
- **Shells and data:** `PageShell` / `AppShell` (see `app/CLAUDE.md` › Shells); data
  through query/mutation hooks with `qk` keys (see `src/lib/query/CLAUDE.md`); copy
  through `t()` with keys in tr + en (see `src/i18n/CLAUDE.md`).
