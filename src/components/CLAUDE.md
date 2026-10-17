# src/components — feature composites

Marketplace components built from `@/ui` primitives, grouped by feature
(`product/`, `collection/`, `listing/`, `orders/`, `shell/`, `common/`, `menu/`,
`payment/`, ...). Primitives themselves live in `src/ui` (see `src/ui/CLAUDE.md`).

## Feature composites

- A composite lives in `src/components/<feature>/`, never at the components root
  (the root files are legacy; move one when you touch it substantially).
- Used by one route only? Keep it in that route's `_components/`. Used by two or
  more routes? Move it here.
- Feature folders may have their own `_lib/` (pure helpers, schemas, invalidation
  sets), `_hooks/` and `_sections/` (e.g. `listing/`).
- Components are presentational: data comes from hooks, feedback from mutation
  hooks. A card that only renders under a condition **self-gates** (returns `null`).
- A component that needs a skeleton exports its geometry metrics and gets a sibling
  `Skeleton<Name>` (`SkeletonProductCard` / `PRODUCT_CARD_METRICS`,
  `SkeletonMenuRow` / `PROFILE_ROW_METRICS`).
- Shell components (`shell/AppShell`, `shell/AppTabBar`, `common/PageShell`,
  `common/ScreenHeader`) are used as described in `app/CLAUDE.md` › Shells.

## Product card

- **One product card.** Every product tile is `ProductCard` (`@/components/product`;
  grid + list, mirrors web `ProductCard` at phone width); never a local card.
- Lists use `ProductGrid` (skeleton -> single empty state -> error), sort via
  `ProductSortModal`, active filters via `ActiveFilterChips`. Collection tiles are
  `CollectionCard` (`@/components/collection`).
- Cards carry a favourite heart (decided for web and mobile together): a small glass
  circle (`GlassIconButton size="sm"`, 32 pt, 44 pt hitSlop) at the image's
  bottom-right, outline / solid `danger-500`, drawn as a sibling of the card
  `Pressable` (tapping it never opens the product).
- Wire it once per list with `useProductCardFavorites()` (`@/hooks/useFavoriteToggle`)
  -> `<ProductCard {...favoriteProps(p)} />` (`ProductGrid` does it itself). It hides
  the heart on the user's own listing and sends guests to sign-in. Detail and card
  share `useFavoriteToggle` (one toggle flow, one favourites cache).
- No "in cart" pill on cards (web has none).

## Price

- Only `formatPrice` (`src/utils/format.ts`) or `ProductPrice`
  (`@/components/product`) -> "1.234,50 TL". Never a `₺` literal
  (`tarodan/no-lira-symbol`).
- A discounted price shows the old one struck through (`theme.priceColor.original`).
- The amount itself always comes from the server (see `src/lib/api/CLAUDE.md` ›
  Money values).

## Status

- Status colour + label come only from the web-identical maps in `src/lib/shared`
  (`status-configs.ts`, `useStatusConfig`, `orderStatus.ts`, `tradeStatus.ts`, ...).
  Never a local status map in a screen or component; route-specific derivations go
  in the route's `_lib/status.ts`.
- Status is never conveyed by colour alone; badges carry a label.

## Menu

- One menu model: `src/lib/menu/profileMenu.ts` with `surface: 'profile' |
  'settings'`. The Profile tab lists the user's activity (Shopping, Finance,
  Collection, Analytics); `/settings` lists Account, Payments & Bank, Membership,
  Preferences, Help & Support, Info & Legal + logout.
- Each group is a white `SectionCard` rendered by `MenuGroupList`
  (`@/components/menu`). Never hand-build a menu list.
