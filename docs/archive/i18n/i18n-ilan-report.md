# i18n slice: listing creation + product surface

Branch `feat/i18n-ilan`, based on `e5486ed`. Covers the file list assigned
in the task (listing form, product detail screen, product components,
cart, my-listings, discounts).

## Starting state

Most of this surface was **already migrated** by earlier slices before this
run started: `ListingSections.tsx`, `ListingForm.tsx`, `useListingForm.ts`,
`constants.ts` (condition factory), `editMapper.ts`, `_lib/types.ts` (both
listing and my-listings), `ProductReviewsPreview.tsx`, `ReportModal.tsx`,
`SignupPrompt.tsx`, `app/cart/index.tsx`, `CartSummary.tsx`, `useCart.ts`,
`MyListingsSections.tsx` all already used `useTranslation`/`t()` correctly
with no remaining literals. Work here filled the gaps.

## Files changed (in commit order)

1. **`src/components/listing/_lib/schema.ts`** — `listingFormSchema` was
   module-scope zod with hardcoded Turkish messages (resolved once, frozen
   at import time). Converted to `buildListingFormSchema(t)`, matching
   `buildApplicationDetailsSchema`/`buildAppealSchema`. Updated the two
   callers: `_lib/validate.ts` and `_hooks/useListingForm.ts`
   (`useZodForm(buildListingFormSchema(t), ...)`, same pattern as
   `business-application`).
2. **`ListingPickers.tsx` + `PickerModal.tsx`** — category/brand/model/
   material/manufacturer/year/attribute-group pickers. All **API-driven**
   (item.name/label comes from the server); only picker titles, empty
   states, and the search placeholder were translated — the list items
   themselves are untouched.
3. **Product detail screen** — `index.tsx` (not-found EmptyState),
   `ProductTopBar.tsx` (a11y labels), `ProductGallery.tsx` (zoom-photo a11y),
   `ProductBottomBar.tsx` (tile labels), `SellerCard.tsx` (sales count/
   response time/message a11y), `useProductActions.ts` (share text),
   `reviews.tsx` (header/count/empty state). Hook order in `index.tsx` is
   unchanged — `t()` is a plain call, not a hook, and sits before the
   existing not-found early return exactly as before.
4. **`MakeOfferModal.tsx` + `BoostModal.tsx`** — MakeOfferModal's 9 strings
   (title, list-price label, amount field, discount hint, message field,
   delivery notice, both buttons). BoostModal had **no** matching catalog
   namespace at all, so a new `boost.*` block was added (title, subtitle,
   active-boost notice, empty states, auto-renew label, both CTAs); the
   per-option "N gün" duration label (`normalizeBoostOptions`, a plain
   function outside any hook) now takes `t` as a parameter.
5. **`ProductCard.tsx` + `ProductGrid.tsx`** — sold-out overlay, boosted/
   sale/preorder/limited/trade badges (rendered ALL-CAPS via
   `.toUpperCase()` on a translated string — same precedent as
   `Snackbar`'s action label — instead of adding new all-caps catalog
   keys), in-cart pill, seller-name line, favorite-toggle a11y.
   `ProductGrid`'s `emptyTitle` default moved from a hardcoded param
   default (evaluated before any hook runs) to `emptyTitle ?? t(...)`
   inside the component body.
6. **`CartItemRow.tsx`** — remove-item, decrease/increase-quantity a11y
   labels, and the "Son {n} adet" stock hint.
7. **`app/settings/my-listings/index.tsx` + `MyListingsModals.tsx`** — the
   error-state card, FAB a11y label, and the whole action-menu +
   delete-confirmation modal (had no `useTranslation` at all).
8. **`app/settings/discounts/`** — `index.tsx`, `DiscountsGate.tsx`,
   `DiscountCard.tsx`, `ProductPickerModal.tsx`, `DiscountFormModal.tsx`
   (value-field label + selected-products count), and `useDiscounts.ts`'s
   delete-confirm alert. `_lib/types.ts`'s `FILTERS` array (a module-level
   list of *resolved* Turkish labels — the exact "module-scope `t()`"
   trap the migration rules warn about) converted to `labelKey: MessageKey`
   entries resolved by the screen, mirroring `my-listings/_lib/types.ts`'s
   `statusTextKey`. `ProductPickerModal`'s product list is API-driven —
   only the modal chrome (title/empty state/OK button) was translated.
9. **`app/__tests__/cart.test.tsx`** (outside the assigned file list, found
   by the final full-suite gate run) — updated for the `cart.removeItem`
   wording change from item 6.

## Keys: reused vs added

**Reused** (no wording change): `product.selectCategory/selectBrand/
selectModel`, `product.soldOut`, `product.inCartShort`, `product.
sponsored`, `product.discount`, `product.preOrder`, `product.tradeShort`,
`product.share`, `product.addToFavorites` (case-only), `product.
makeOffer`, `product.listPriceLine`, `offer.yourOfferAmount`, `offer.
sendOffer`, `offer.enterPositiveAmount`, `listing.dismiss`, `common.back`,
`common.goBack`, `report.report`, `review.reviews`, `review.noReviews`,
`common.actions/view/edit/cancel/delete/login/ok/inactive`, `product.
deleteListing`, `listing.deactivateAction`, `listing.loginRequiredTitle`,
`discount.newTitle/active/scopeSelected/scopeAllStore`, `home.
noProductsYet`, `refund.sellerLabel` (reused across a domain boundary —
exact ICU match).

**Reused with a documented wording change** (rule #1 — every one below is
a real, if small, visible-text change):
- product/listing pickers: material/manufacturer/year modal titles and the
  attribute-group title lose their capital "S" (`product.selectMaterial`
  etc. were already lowercase in the catalog: "Malzeme seçin" not
  "Malzeme Seçin")
- brand/model picker empty states gain a trailing period
  (`brands.noResults`/`models.noResults`)
- product-detail buy-now tile: "Hızlı Al" → "Hemen Al" (`product.buyNow`)
- SellerCard message a11y label: case only, "gönder" → "Gönder"
- schema title-min-length error: "Başlık en az 5 karakter olmalıdır." →
  "En az 5 karakter olmalıdır" (`validation.minLength`, drops the field
  name and the trailing period)
- schema price error: "Geçerli bir fiyat giriniz." → "Lütfen geçerli bir
  fiyat girin" (`common.invalidPrice`)
- MakeOfferModal: "Pozitif bir teklif tutarı girin." → `offer.
  enterPositiveAmount` ("Pozitif bir tutar girin.", drops "teklif");
  "Satıcıya bir mesaj ekleyin..." → `product.offerMessagePlaceholder`
  ("Satıcıya iletmek istediğiniz mesaj..."); the failed-share fallback
  drops its retry sentence (`product.offerFailed`)
- MyListingsModals delete-confirm title reuses `product.deleteListing`
  (already exact, no change) but the FAB/menu items reuse `listing.
  deactivateAction` (exact) — no change there
- cart remove-item a11y: "Ürünü sepetten kaldır" → `cart.removeItem`
  ("Ürünü Kaldır", drops "sepetten")
- DiscountCard edit/delete a11y labels reuse `discount.editTitle`/
  `deleteTitle` (their modal-title casing: "İndirimi Düzenle"/"İndirimi
  Sil" vs the previous lowercase a11y text)
- ProductPickerModal title reuses `discount.pickProducts` ("Ürün seçin")
  for what was "Ürün Seç" (case + word order)

**Added** (no existing match found): `common.searchPlaceholder`,
`listing.categoryPickerEmpty/materialPickerEmpty/manufacturerPickerEmpty/
yearPickerEmpty`, `product.productNotFoundTitle`, `product.zoomPhotoA11y`,
`product.sellerTotalSalesCount`/`sellerResponseTimeLabel` (both ICU, were
concatenation), `product.shareText` (ICU `{title}`/`{price}`, was a
template literal with a hardcoded promo phrase), `review.countLabel`
(ICU), `offer.amountPlaceholderExample`, `offer.minimumOfferErrorTl`
(ICU), `offer.aboveListPriceError`, `offer.discountBelowListText` (ICU),
`offer.offerDeliveryNotice`, the whole `boost.*` namespace (8 keys),
`product.limitedBadge` (added to the `INTENTIONALLY_IDENTICAL` exemption
list alongside `product.limitedEdition` — same word in both languages),
`cart.lastStockCount` (ICU), `listing.loadListingsFailed/createNewA11y/
boostAction/relistAction/deleteConfirmNamed` (ICU), a `discount.*` block
for gate/empty-state/error copy (`myDiscountsTitle`, `loginRequiredBody`,
`sellerRequiredTitle`/`Body`, `becomeSeller`, `emptyTitle`/`emptySubtitle`,
`createNewA11y`, `noActiveProducts`, `filterExpired`, `deleteConfirmNamed`
ICU, `valueLabelPercent`/`valueLabelFixed`, `productsSelectedCount` ICU).

## Product data left untranslated (by design)

- Scale/brand/model/manufacturer/category **names and slugs** everywhere
  they come from the API (`ListingPickers`, `ProductPickerModal`,
  `ProductCard`'s brand/scale meta line) — server data, not language.
- `FALLBACK_SCALES`/`FALLBACK_MATERIALS` in `_lib/constants.ts` — untouched
  static client-side fallback lists (pre-existing, out of this slice's
  scope; the material labels already carry bilingual parentheticals like
  "Diecast (Metal)").
- Condition options continue to come from the single `buildConditions(t)`
  factory in `constants.ts`, which already shares its catalog keys
  (`product.condition*`) with `buildConditionOptions(t)` in
  `productFilters.ts` — no second list was written.

## API-driven vs local pickers

- **API-driven** (only the picker chrome is translated, list items are
  server data): category, brand, model, manufacturer pickers in
  `ListingPickers.tsx`; the attribute-group pickers (`group.attributes`);
  `ProductPickerModal.tsx`'s product list.
- **Local/static**: material picker (`effectiveMaterials`, ultimately
  backed by `FALLBACK_MATERIALS` when the API list is empty — labels are
  untouched product data either way), year picker (`YEAR_OPTIONS`, plain
  numbers, not language).

## Zod schema and label-map conversions

- `listingFormSchema` → `buildListingFormSchema(t)` (see item 1 above).
- `discounts/_lib/types.ts`'s `FILTERS` converted from resolved-label
  entries to `labelKey: MessageKey` entries (see item 8).
- No other module-scope label map with resolved text remained in this
  slice's file list — `constants.ts`'s `buildConditions(t)` and
  `editMapper.ts` were already correct on entry.

## Tests updated

- `src/components/listing/__tests__/validate.test.ts` — title-min-length
  assertion updated for the `validation.minLength` reuse.
- `src/components/listing/__tests__/ListingForm.test.tsx` — same
  title-min-length assertion, plus the price-error assertion for
  `common.invalidPrice` reuse.
- `app/settings/__tests__/my-listings.test.tsx` — that suite globally
  mocks `useTranslation` to return the raw key; the "Düzenle" assertions
  now assert on `"common.edit"` (the real catalog text for end users is
  unchanged).
- `app/__tests__/cart.test.tsx` — updated for the `cart.removeItem`
  wording change (found by the final full-suite run, not in the assigned
  file list).

No assertion was weakened — every change either matches a real wording
change (documented above) or a test's own mocking convention.

## Gates

- `npx tsc --noEmit` — clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` — 0 errors, 1106 warnings (tracked baseline
  ~1105; no new warning category introduced).
- `npx jest` — **210 suites / 1672 tests, all green** (confirmed twice:
  once after the last content commit, once after the `cart.test.tsx` fix).
- `node scripts/gen-keys.mjs` run after every catalog edit;
  `src/i18n/__tests__/catalog-integrity.test.ts` (key-skeleton parity,
  ICU-apostrophe guard, generated-types freshness, no-untranslated-keys)
  passes throughout.

## Notes for the next slice

- `src/components/listing/_lib/constants.ts`'s `FALLBACK_MATERIALS` labels
  ("Diecast (Metal)", "Resin (Reçine)", …) are still hardcoded bilingual
  strings — out of scope here since they're static fallback data, not
  clearly "UI copy," but worth a decision call in a future pass.
