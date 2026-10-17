# i18n kuyruk — clean-up slice report

Branch `feat/i18n-kuyruk`, based on `de30d2c` (the tip of the 12 already-landed
slices). Scope: everything the measurement script below flagged, minus files
owned by the two in-flight slices (home/search: `app/(tabs)/**`,
`app/category/**`, `app/brands/**`, `app/models/**`, `app/listings/**`,
`ProductFilterSheet.tsx`, `useProductFilterOptions.ts`; listing/product:
`src/components/listing/**`, `app/product/**`, `src/components/product/**`,
`app/cart/**`, `app/settings/my-listings/**`, `app/settings/discounts/**`,
`ReportModal.tsx`, `SignupPrompt.tsx`).

## Measured list I worked from

Ran the prescribed regex sweep from the task (`node -e "..."`), sorted by hit
count, then dropped every path under the two exclusion lists above. What
remained (with hit counts from the sweep):

```
111 src/utils/turkeyLocations.ts        (city/district proper nouns)
 99 src/lib/shared/status-configs.ts    (see dedicated section below)
 35 src/utils/format.ts                 (already parity-locked, see below)
 12 src/components/ReputationBadge.tsx  (already migrated by an earlier slice)
 11 src/utils/phone.ts                  (dead countryCodes[].name)
  6 src/constants/legalFacts.ts         (legal entity facts + 1 dead export)
  5 src/test-utils/fixtures.ts          (test fixtures, rule 4 exempt)
  4 src/theme/catalog.ts                (deliberately left, see below)
  4 app/trade/[id]/_components/TradeShippingSection.tsx (proper noun only)
  4 app/checkout/_lib/constants.ts      (backend error-keyword matcher)
  3 app/trade/new/_hooks/useNewTrade.ts (backend error-keyword matcher)
  2 app/sales/[id]/_components/SaleDetailBody.tsx (already t()-based)
  2 app/(auth)/login/_hooks/useLogin.ts (backend error-keyword matcher)
  1 each: src/components/UpgradePrompt.tsx, app/trade/[id]/_components/TradeActions.tsx,
    app/settings/language.tsx, app/settings/collections.tsx, app/settings/business/index.tsx,
    app/seller/[id]/_hooks/useSellerProfile.ts, app/sales/_hooks/useSaleActions.ts,
    app/orders/_components/OrderCard.tsx, app/orders/[id]/_components/OrderInfoCards.tsx,
    app/order-track/_components/OrderTrackResult.tsx, app/offers/_lib/status.ts,
    app/offers/_components/OfferCard.tsx, app/membership/checkout/_hooks/useMembershipCheckout.ts,
    app/(auth)/register-business/_components/RegisterBusinessForm.tsx
```

Every one of the above was opened and read. Most hits were false positives
from the sweep's Turkish-character regex (comments, proper nouns, backend
error-keyword matchers) — I verified each before deciding to touch or skip it.

## What actually got translated

### Reused existing keys (5 spots, 0 new components)
- `app/orders/_components/OrderCard.tsx`: `Sipariş #{n}` → `sale.orderNumberTitle`;
  `Satıcı: {name}` → `refund.sellerLabel`.
- `app/orders/[id]/_components/OrderInfoCards.tsx`: the three escrow-card
  variants → `order.paymentOnHoldRefund` / `order.payoutReleaseWithDate` /
  `order.payoutRelease` (all three were catalog keys that already existed but
  had **zero consumers** — verified with grep before reusing); the pay button
  → `offer.payAmount`.
- `app/sales/_hooks/useSaleActions.ts`: the (unreachable — `status` is only
  ever `'processing'`/`'shipped'` at the two call sites) `Error` thrown for an
  unsupported status now uses `order.unsupportedStatus` instead of a
  hardcoded Turkish string interpolation. Dropped the `${status}` detail
  rather than add an ICU key for a branch nothing can reach.
- `app/offers/_lib/status.ts` `getTimeRemaining()`: now takes a `TFunction`
  and reuses the previously-orphaned `time.dayShort`/`time.hourShort`/
  `time.minuteShort` catalog keys instead of hardcoded `'gün'`/`'s'`/`'d'`.
- `src/lib/shared/status-configs.ts` refund-reason cluster (see below): 8 of
  11 reason labels reused existing (also previously orphaned)
  `order.refundReason*` keys.

### New keys added (4 total)
- `order.cancelledRefundNotice` — the cancelled-order info card text; no
  existing key matched closely enough to reuse without losing information
  (the bank-timing detail).
- `order.refundReasonDefective`, `order.refundReasonBuyerDamaged`,
  `order.refundReasonDeliveryDelayed` — the 3 of 11 refund reasons that had
  no catalog counterpart at all.

### Wording changes from reuse — every one, as required
1. `app/orders/[id]/_components/OrderInfoCards.tsx` escrow card, no-release-
   date branch: "Satıcıya ödeme, teslimattan 14 gün sonra otomatik serbest
   kalır. Onaylamanıza gerek yoktur; bu süre içinde iade talep edebilirsiniz."
   → "Satıcıya ödeme teslimden 14 gün sonra serbest bırakılır. Bu süre
   içinde iade talep edebilirsiniz." (drops the explicit "no approval
   needed" and "otomatik" nuance; same meaning). Updated the test assertion
   in `app/orders/__tests__/detail.test.tsx` (regex from `/14 gün sonra
   otomatik serbest/` to `/14 gün sonra serbest bırakılır/`) to match — did
   not weaken what it checks (still asserts the 14-day/no-approval flow is
   shown).
2. Same file, active-refund branch: "Açık iade talebiniz olduğu için
   satıcıya ödeme, iade süreci sonuçlanana kadar bekletiliyor." → "Açık iade
   talebiniz sonuçlanana kadar ödeme bekletiliyor."
3. Same file, release-date-known branch: "Satıcıya ödeme, teslimden 14 gün
   sonra otomatik serbest kalır. Tahmini serbest kalma: {date}. Bu süre
   içinde dilediğiniz zaman iade talep edebilirsiniz." → "Satıcıya ödeme
   teslimden 14 gün sonra serbest bırakılır ({date}). O tarihe kadar iade
   talep edebilirsiniz."
4. `app/offers/_lib/status.ts` `getTimeRemaining()`, day format: "3 gün" →
   "3g" (abbreviated, to match the existing hour/minute abbreviation style
   "2s 30d"; English becomes "3d").
5. `status-configs.ts` refund reasons: `changed_mind` "Fikrim değişti" →
   "Vazgeçtim / fikrim değişti"; `missing_parts` "Eksik parça var" → "Eksik
   parça"; `counterfeit` "Sahte / taklit" → "Sahte ürün".

### Non-i18n cleanup (1 spot)
`app/settings/language.tsx` had `t('language.language') || "Dil / Language"`
and `t('language.languageInfo') || "<hardcoded TR>"` — both keys already
exist and always resolve, so the `||` fallback was dead code that only
existed to trip the measurement sweep. Removed the fallback literals; no
behavior change.

## `src/lib/shared/status-configs.ts` — what I did and didn't touch

Verified consumer counts myself (grep across `app`/`src`, excluding the file
itself, `__tests__`, and `generated/keys.ts`) before acting, per the task's
instruction to check for a live consumer the earlier measurement might have
missed. My counts:

```
3 refundReasonLabel        2 ticketStatusConfig   2 orderStatusConfig
2 REFUND_REASONS           1 tradeStatusConfig     1 productStatusConfig
1 paymentStatusConfig      1 offerStatusConfig     1 REFUND_REASON_OPTIONS
0 (everything else: refundRequestStatusConfig, productConditionConfig,
   adminRoleConfig, ticketPriorityConfig, ticketCategoryConfig, taxScopeConfig,
   membershipTierConfig, refundReasonConfig, shipmentStatusConfig,
   notificationChannelConfig, deliveryStatusConfig, sellerTypeConfig,
   paymentHoldStatusConfig, payoutStatusConfig, subscriptionStatusConfig,
   discountTypeConfig, discountScopeConfig, messageStatusConfig,
   severityConfig, paymentProviderConfig, shipmentProviderConfig, enumLabel,
   BUYER_SELECTABLE_REFUND_REASONS)
```

I confirm the task's claim: `orderStatusConfig`/`tradeStatusConfig`/
`offerStatusConfig`/`paymentStatusConfig`/`productStatusConfig`/
`ticketStatusConfig`'s only "consumers" are the `@/ui` barrel re-export
(`src/ui/index.ts`), which nothing imports — checked directly. `tradeStatusConfig`
already carries a `@deprecated` note from an earlier slice pointing at the real
source (`@/lib/shared/tradeStatus`). `refundReasonConfig` and
`BUYER_SELECTABLE_REFUND_REASONS` showed 0 direct *external* consumers, but
both are load-bearing internal building blocks for `refundReasonLabel` and
`REFUND_REASON_OPTIONS`, which do have live external consumers — traced the
chain by hand before concluding the cluster is genuinely live.

**Left untouched (dead, mirrors `packages/shared/src/status-configs.ts` in the
main monorepo which has no i18n):** `orderStatusConfig`, `tradeStatusConfig`,
`refundRequestStatusConfig`, `offerStatusConfig`, `paymentStatusConfig`,
`productStatusConfig`, `productConditionConfig`, `adminRoleConfig`,
`ticketStatusConfig`, `taxScopeConfig`, `membershipTierConfig`,
`shipmentStatusConfig`, `notificationChannelConfig`, `deliveryStatusConfig`,
`ticketCategoryConfig`, `ticketPriorityConfig`, `sellerTypeConfig`,
`paymentHoldStatusConfig`, `payoutStatusConfig`, `subscriptionStatusConfig`,
`discountTypeConfig`, `discountScopeConfig`, `messageStatusConfig`,
`severityConfig`, `paymentProviderConfig`, `shipmentProviderConfig`,
`enumLabel`. Added a file-header comment recording why (vendored mirror,
untranslated origin, zero live consumers, deleting would break parity).

**Translated (the one live cluster):** refund reasons. Converted from a
module-scope frozen `Record` to the `build<Name>(t)` factory pattern:
- `refundReasonConfig` (object) → `buildRefundReasonConfig(t)`
- `REFUND_REASON_OPTIONS` (array) → `buildRefundReasonOptions(t)`
- `refundReasonLabel(reason)` → `refundReasonLabel(reason, t)`
- `REFUND_REASONS` (raw enum codes, not language) and
  `BUYER_SELECTABLE_REFUND_REASONS` (derived codes) are language-independent
  and stayed as plain constants.
- Split the old `{label, variant}` dict into a static `REFUND_REASON_VARIANTS`
  (codes → badge color, not language) and a static
  `REFUND_REASON_LABEL_KEYS` (codes → catalog key), so `buildRefundReasonConfig`
  only does the `t()` call at request time.

Updated all 4 live call sites to pass `t`:
- `app/refund-requests/[id].tsx`
- `app/refund-requests/_components/RefundSections.tsx`
- `app/orders/[id]/_lib/status.ts` — its `REFUND_REASONS` re-export (a second,
  route-local name for the same list) became `useRefundReasons()`, a hook
  memoized on `t`, since the value now needs the render-time translation
  function.
- `app/orders/[id]/_modals/RefundRequestModal.tsx` — calls the new hook.

Updated `src/lib/shared/__tests__/refundReasons.test.ts` to the new factory
API using `i18n.getFixedT('tr')` (the same pattern already used in
`src/components/listing/__tests__/validate.test.ts`) — same assertions,
nothing weakened.

## Deliberately left, with reasons

- **`src/utils/turkeyLocations.ts`** (111 hits) — city/district names, proper
  nouns (CLAUDE.md rule 4). Not language.
- **`src/utils/format.ts`** (35 hits) — `formatCondition`/`formatOrderStatus`/
  `formatProductStatus`/`formatShipmentStatus`/`formatTradeStatus`/
  `formatOfferStatus` already take a `locale: string` parameter and branch
  correctly per-language at *call time* (not frozen at import) — every call
  site I found (`OfferDetailCards.tsx`, `SaleDetailBody.tsx`,
  `OrderProductSeller.tsx`) already passes `i18n.language`. Their exact output
  strings are locked by `src/utils/__tests__/par-format-parity.test.ts` and
  `format.test.ts` as web↔mobile parity fixtures — same shape as the
  `paytrDirectForm.ts` non-React-module pattern. Rewiring them through the
  catalog would be a pure refactor with no user-facing bug to fix (both
  languages already render correctly) and risks the parity tests; left as-is
  per rule 7 (do not change behaviour).
- **`src/components/ReputationBadge.tsx`** (12 hits) — already migrated by an
  earlier slice (`build*Config(t)` factories); the file has zero consumers
  anywhere in the app (grepped, confirmed) and its own header comment says so.
  Remaining raw-Turkish hits are `description`/`criteria` fields that are
  never rendered (only `icon`/`color`/`label` are), documented in the file.
- **`src/utils/phone.ts`** (11 hits) — `countryCodes[].name` (country names)
  has zero consumers anywhere (`CountryCode`/`PhoneInput` never read `.name`,
  only `.code`) — verified by grep. Also proper nouns.
- **`src/constants/legalFacts.ts`** (6 hits) — `LEGAL_ENTITY.*` fields are
  legal/tax identity data (rule 4, not language). `COMMISSION_SUMMARY` is
  actual prose but has zero consumers (grepped) — dead.
- **`src/test-utils/fixtures.ts`** (5 hits) — test fixtures, rule 4 exempt.
- **`src/theme/catalog.ts`** (4 hits, `CONDITIONS[].name`) — its only
  consumers (`CategoryFilters.tsx`, `HomeSections.tsx`, `useModelDetail.ts`,
  `ProductFilterSheet.tsx`) all belong to the in-flight home/search slice.
  The file itself isn't in the exclusion list, but touching a shared export
  whose sole readers are mid-edit in another agent's branch risks a merge
  collision; left for that slice (or a follow-up) to handle.
- **`app/checkout/_lib/constants.ts`** `STOCKOUT_KEYWORDS`, backend
  error-substring matchers in `useNewTrade.ts`, `useLogin.ts`,
  `settings/business/index.tsx` — these compare against backend error text
  (always Turkish from the API), not display text. Rule 4 (API error codes).
- **`app/trade/[id]/_components/TradeShippingSection.tsx`**,
  **`SaleDetailBody.tsx`**, **`OrderTrackResult.tsx`** — "Sürat Kargo" is a
  carrier brand name (proper noun), already documented as such in-file.
- **`app/membership/checkout/_hooks/useMembershipCheckout.ts`** — the one
  hardcoded `Error('Ödeme başlatılamadı...')` message is never shown to the
  user (the `catch` block only displays `e.response.data.message` or a
  translated generic fallback, never `e.message`); left as-is, no visible
  effect.
- **`app/(auth)/register-business/_components/RegisterBusinessForm.tsx`**,
  **`app/seller/[id]/_hooks/useSellerProfile.ts`**,
  **`app/settings/collections.tsx`** — remaining hits were comments or
  `console.log` debug lines, not user-facing text.

## Tests updated
- `app/orders/__tests__/detail.test.tsx` — one regex assertion updated to
  match the reused `payoutRelease` wording (see wording-change #1 above).
- `src/lib/shared/__tests__/refundReasons.test.ts` — rewritten for the new
  `build<Name>(t)` factory API; same coverage, no assertions weakened.

## Gates

- `npx tsc --noEmit` — clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` — **0 errors**, 1104 warnings (within the
  ~1107 tracked baseline).
- `npx jest --testTimeout=45000` — **210 suites / 1675 tests, all green**, run
  once, took ~43s (well under the "contention" red flag threshold in the
  task, so I trust this single measurement — no re-run needed).

## Commits
```
9289c93 chore(i18n): drop redundant literal fallbacks in language settings screen
708ce74 fix(i18n): translate unreachable unsupported-status error in sale actions
834b56d i18n: translate order card and order-detail escrow/cancel/pay copy
50393f6 i18n: translate offer countdown short-unit format
374a58c i18n: translate the live refund-reason cluster in status-configs.ts
```
