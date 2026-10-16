# i18n slice report — home / search / browse (anasayfa)

Base commit: `1865226` (merge: i18n for messaging and notifications)
Branch: `feat/i18n-anasayfa`

## Scope covered

- Home tab: `app/(tabs)/index.tsx`, `_hooks/{useHomeData,useProfileActions,useProfileData,useSearch}.ts`,
  `_lib/{styles,nav,profileConstants,searchConstants}.ts`,
  `_components/{HomeSections,HomeHeader,CompanyOfWeekSection,AppTabBar,ProfileSections}.tsx`
- Search: `app/(tabs)/search.tsx`
- Browse: `app/category/[slug]/**`, `app/brands/{index,[slug]}.tsx`, `app/models/**`, `app/listings/**`
- Leftovers: `src/components/ProductFilterSheet.tsx`, `src/hooks/useProductFilterOptions.ts`,
  `src/utils/productFilters.ts` (touched — see SORT_OPTIONS below)
- Also found and fixed via a final grep sweep (not on the original file list, but directly rendered by
  in-scope screens): `app/(tabs)/_components/{ProductCard,SearchResultCard}.tsx`,
  `app/category/[slug]/_components/CategoryProductCard.tsx`, `app/listings/_components/ListingCard.tsx`

## Keys: reused vs added

- **23 new keys added** (both `tr.json` and `en.json`, verified via key-diff against the base commit):
  `brands.emptyProductsTitle`, `cart.inCartBadge`, `filter.tradeOnlyChip`, `home.businessBadge`,
  `home.checkApiConnection`, `home.featuredCollectionCount`, `home.reviewCountSuffix`,
  `listing.emptyFilterHint`, `listing.loadingListings`, `listing.resultsCount`, `models.backToModels`,
  `models.diecastModelsFor`, `models.emptyHint`, `models.emptySearchHint`, `models.noProductsForModel`,
  `models.notFoundDesc`, `product.noProductsFound`, `product.noProductsInCategory`,
  `product.productsFoundCount`, `profile.garageEmptyDesc`, `profile.myDigitalGarage`,
  `profile.tierMemberBadge`, `search.scrollToTop`.
  Each was added only after a catalog search failed to turn up a close existing key.
- All other ~50 literals in this slice reused an existing key. `home.businessBadge` ("👑 Business") is
  identical in both locales by design (brand/tier name) and was added to the
  `INTENTIONALLY_IDENTICAL` exemption list in `catalog-integrity.test.ts`.

## Every wording change from reuse (rule 1)

Reuse changed visible copy in these places (each is a legitimate near-duplicate, not a meaning change):

| File | Old (Turkish) | Reused key → new text | Note |
|---|---|---|---|
| HomeSections.tsx (category chip) | `{count} ürün` | `collection.itemCountSuffix` | same text, cross-domain reuse |
| CompanyOfWeekSection.tsx | `👑 Business` | new `home.businessBadge` | (added, not reused — listed for completeness) |
| ProfileSections.tsx (trust score) | `Güven {score}/100 · {level}` | `seller.trustScoreLabel` + `seller.trustScoreLevelSuffix` | `seller.trustScoreLabel` says "Güven **Skoru** {score}/100" — adds "Skoru" |
| useProfileActions.ts (delete confirm body) | `Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?` | `settings.deleteAccountConfirm` | shorter existing confirm sentence |
| useProfileActions.ts (delete error fallback) | `Hesap silinemedi. Lütfen tekrar deneyin.` | `profile.deleteAccountFailed` | dropped the "try again" suffix — no key had it |
| SearchSortModal.tsx / ListingsSortModal.tsx title | `Sıralama` | `common.sort` ("Sırala") | noun → imperative form |
| app/category/[slug]/_components/CategoryFilters.tsx | `Ara...` | `common.search` ("Ara") | dropped ellipsis |
| app/(tabs)/search.tsx (empty state title) | `Sonuç Bulunamadı` | `search.noResults` ("Sonuç bulunamadı") | case change → **test updated** (`search.test.tsx`) |
| app/(tabs)/search.tsx (empty state subtitle) | `Farklı anahtar kelimeler veya filtreler deneyin` | `search.tryDifferent` | drops "veya filtreler" |
| app/(tabs)/search.tsx / searchCollapse loading text | `Sonuçlar yükleniyor...` (3 dots) | `filter.resultsLoading` (`…` ellipsis char) | different Unicode char → **test updated** (`searchCollapse.test.tsx`) |
| app/listings/_lib/chips.ts, useSearch.ts (chip labels) | `İndirimli` | `filter.discountOnlyLabel` ("Sadece İndirimli") | adds "Sadece" |
| same (chip) | `Limited` | `product.limitedEdition` ("Limited Edition") | adds "Edition" |
| same (chip) | `Set` | `product.setBundle` ("Set / Paket") | adds "/ Paket" |
| app/brands/[slug].tsx (error text) | `Ürünler yüklenemedi.` | `collection.productsLoadFailed` (no trailing period) | → **test updated** (`app/brands/__tests__/slug.test.tsx`) |
| app/models/index.tsx (title) | `Araba Modelleri` | `models.title` ("Modeller") | shorter; no test covers this screen |
| app/models (years suffix) | `günümüz` (lowercase) | `models.present` ("Günümüz") | capitalization only |
| app/models/[slug]/index.tsx (not-found title) | `Model bulunamadı` (no period) | `models.noResults` (with period) | punctuation only; no test |

Tests updated to match (both are real wording changes from reuse, not weakened assertions):
`app/(tabs)/__tests__/search.test.tsx`, `app/(tabs)/__tests__/searchCollapse.test.tsx`,
`app/brands/__tests__/slug.test.tsx`.

## `_lib/styles.ts` audit (item 1)

Grepped `app/(tabs)/_lib/styles.ts` (1097 lines) for any capitalized/Turkish-looking string literal.
Every hit was a React Native style value (`'center'`, `'bold'`, `'absolute'`, `'space-between'`, …) or an
import path — no user-facing copy. Left untouched, per CLAUDE.md §12's fifth worked example.

## Five leftover filter chips (item 2)

`app/listings/_lib/chips.ts` and `app/(tabs)/_hooks/useSearch.ts` both build the *same* five chips inline
(duplicated logic, not shared) — both were fixed:
- `Takaslı` → new `filter.tradeOnlyChip` (no existing key fit; `product.tradeOnlyHint` is a full sentence
  helper-text, not a chip label)
- `İndirimli` → reused `filter.discountOnlyLabel`
- `Ön Sipariş` → reused `product.preOrder` (exact match)
- `Limited` → reused `product.limitedEdition`
- `Set` → reused `product.setBundle`

All five now route through the `t` the call sites already had (`buildActiveChips(filters, setFilters, t)`
in chips.ts; local `t` in `useSearch`).

## Duplicate `conditionLabel` (item 3)

`app/models/[slug]/_hooks/useModelDetail.ts` had its own `conditionLabel` closure built from
`@/theme/catalog`'s legacy `CONDITIONS` array (`new/like_new/good/fair/poor`, Turkish literals, colors).
Compared to the shared `buildConditionOptions(t)` (`new/like_new/very_good/good/fair`) the **value sets
differ**: this screen's condition list has `poor` but not `very_good`. Pointing it at
`buildConditionOptions(t)` would have silently dropped the "poor" condition's label. Converted **in
place** instead: a small `switch` over the same 5 ids, each returning
`t('product.condition{New,LikeNew,Good,Fair,Poor}')` — all five of those catalog keys already existed.
The unused `CONDITIONS` import was removed from this file; the `@/theme/catalog` export itself is left in
place (not referenced anywhere else in this slice, out of scope to delete a shared theme export).

## Module-scope label lists converted (rule 2)

- `app/(tabs)/_lib/profileConstants.ts`, `nav.ts`, `searchConstants.ts`: **already** `build<Name>(t)`
  factories from an earlier slice — verified, no change needed.
- `app/category/[slug]/_lib/constants.ts`: its `SORT_OPTIONS` (`{id, name}` shape, Turkish literals) →
  `buildSortOptions(t)`. Updated its two consumers (`useCategory.ts`, `CategoryFilters.tsx`).
- **Not originally on the list but the same anti-pattern:** `src/utils/productFilters.ts`'s
  `SORT_OPTIONS` (`{value, label, icon}`, Turkish literals) was also a frozen-at-import-time array, used by
  four screens across this slice (`SearchSortModal`, `SearchBars`, `ListingsSortModal`, `useListings`) —
  converted to `buildSortOptions(t)` (reuses `product.sortNewest/sortOldest/sortPopular/sortPriceLow/
  sortPriceHigh/sortHighestRating`, all pre-existing). All four consumers updated to call it with a live
  `t`. `ListingsSortModal.tsx` isn't in the explicit file list but had to be touched — removing the old
  export without updating it would have broken the build.

## Test updates

- `app/(tabs)/__tests__/search.test.tsx`: `'Sonuç Bulunamadı'` → `'Sonuç bulunamadı'` (case, from reuse).
- `app/(tabs)/__tests__/searchCollapse.test.tsx`: `'Sonuçlar yükleniyor...'` → `'Sonuçlar yükleniyor…'`
  (ellipsis character, from reuse).
- `app/brands/__tests__/slug.test.tsx`: `'Ürünler yüklenemedi.'` → `'Ürünler yüklenemedi'` (dropped
  period, from reuse).
- No other slice tests touch translated strings; `app/models/`, `app/listings/`, `app/category/[slug]/`
  (aside from the passing existing `slug.test.tsx`) have no test coverage for the literals changed.

## Gates (final, from repo root of this worktree)

- `npx tsc --noEmit` → clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` → **0 errors**, 1106 warnings (tracked baseline ~1107 — within range).
- `npx jest` → **210 suites / 1672 tests**, all green.
- `node scripts/gen-keys.mjs` run after every catalog edit; `catalog-integrity.test.ts` passes (key
  parity, key order, no empty values, ICU apostrophe rule, generated-keys freshness, no
  unintentionally-identical values).

## Commits (chronological)

1. `d4dbab5` i18n(home): translate HomeSections remaining literals
2. `48b06ab` i18n(home): translate HomeHeader search placeholder and CompanyOfWeekSection
3. `f2ec261` i18n(profile): translate ProfileSections literals
4. `c34d327` i18n(profile): translate delete-account alert in useProfileActions
5. `12d636a` i18n(search/listings/category): convert SORT_OPTIONS to build<Name>(t) factories, fix leftover filter chips
6. `b2fb52f` i18n(search): translate search.tsx screen literals
7. `a171b66` i18n(category): translate category detail screen and product card
8. `a0dd2c5` i18n(brands): translate brands list and brand detail screens
9. `126ebfd` i18n(models): translate models list, model detail, and brand sections
10. `903ea08` i18n(listings): translate listings index, search bar, and card
11. `2a9afd9` i18n(home/search): translate ProductCard and SearchResultCard badges
