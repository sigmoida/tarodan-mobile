# i18n — paylaşılan (shared) utilities & UI primitives slice

Branch: `feat/i18n-paylasilan`, based on `d3f119a`.

## Scope covered

Every file in the assignment was inspected. Files with no user-facing
literals (pure logic, already-migrated, or data-only) are listed as "no
change" — I read the whole file before concluding that, not just grepped.

| File | Result |
|---|---|
| `src/utils/format.ts` | Fixed `tr-TR` hardcode (see below) |
| `src/utils/phone.ts` | Translated `PHONE_INVALID_MESSAGE` → `getPhoneInvalidMessage()`, `getPhonePlaceholder` fallback |
| `src/utils/validation.ts` | Reused `t` already in scope for the two phone-invalid issues |
| `src/utils/formatApiErrorMessage.ts` | Fixed hardcoded default fallback |
| `src/utils/apiEnvelope.ts` | No change — no user-facing strings |
| `src/utils/quoteLines.ts` | No change — no user-facing strings |
| `src/utils/contentFilter.ts` | Translated violation labels + message; regexes untouched (behavior) |
| `src/utils/guestRestrictions.ts` | Fixed module-scope freeze (`RESTRICTION_MESSAGES` → `RESTRICTION_KEYS` + call-time resolution) |
| `src/utils/imageUrl.ts` | No change — URLs/data only |
| `src/utils/productFilters.ts` | Fixed `SORT_OPTIONS` module-scope freeze → `buildSortOptions(t)` |
| `src/lib/shipping/tracking.ts` | No change — URLs/data only |
| `src/lib/shipping/shipmentStatus.ts` | No change — already migrated (`t` param, catalog keys) |
| `src/lib/shared/orderStatus.ts` | No change — already migrated (`useOrderStatusConfig`) |
| `src/lib/api/client.ts` | No change — dev-only `console.log`, no user-facing strings |
| `src/lib/api/auth.ts` | No change |
| `src/lib/api/user.ts` | No change |
| `src/lib/api/authFailureKind.ts` | No change — status/errorCode branching, not copy |
| `src/lib/api/requestId.ts` | No change |
| `src/ui/components/DateField.tsx` | Translated + fixed its own `tr-TR` hardcode |
| `src/ui/components/Input.tsx` | Translated password show/hide a11y labels |
| `src/ui/components/Select.tsx` | Translated default placeholder |
| `src/ui/components/ErrorState.tsx` | Translated defaults, wired to `mobile.error*` |
| `src/ui/components/form/Form.tsx` | No change — no literal strings |
| `src/components/ErrorBoundary.tsx` | Wired `FallbackScreen` to `useTranslation` (keys existed, unused) |
| `src/components/ForceUpdateGate.tsx` | Migrated module-scope `COPY` object |
| `src/components/AppImage.tsx` | No change — no user-facing strings |
| `src/components/AnimatedSplash.tsx` | No change — no user-facing strings |
| `src/components/ReputationBadge.tsx` | Fixed module-scope config freeze; **zero callers found** |
| `src/components/ShareModal.tsx` | Translated; **zero callers found** |
| `src/components/RatingModal.tsx` | Translated; **live** (orders/index, orders/[id]) |
| `src/components/common/AuthRequiredSheet.tsx` | Translated defaults; **zero callers found** |
| `src/components/common/PhoneInput.tsx` | Default invalid-message now reads `getPhoneInvalidMessage()` |
| `src/hooks/useRefresh.ts` | No change |
| `src/hooks/useCartSync.ts` | No change — already fully migrated |
| `src/services/googleSignin.ts` | Translated thrown Error messages (shown via `appAlert(title, e.message)`) |
| `src/services/appleSignin.ts` | Same |
| `src/services/sentry.ts` | No change |
| `src/services/sentryScrub.ts` | No change — field-name scrub list is a matcher, not copy |
| `src/stores/authStore.ts` | No change |
| `src/stores/cartStore.ts` | No change |
| `src/stores/resetUserStores.ts` | No change |

## `format.ts` locale fix (explicitly requested)

`formatPrice`/`formatPriceNumber` hardcoded `'tr-TR'` in `toLocaleString`
regardless of active language — the currency suffix (`" TL"`) is untouched
(this is a TRY-only marketplace), only the **grouping/decimal formatting**
now follows `i18n.language` via a new `activeNumberLocale()` helper
(`'en'` → `'en-US'`, else `'tr-TR'`), read at **call time** since this is a
non-React module (same pattern as `paytrDirectForm.ts`).

`formatRelativeDate`'s `locale` parameter defaulted to the literal `'tr'`
regardless of active language — default now reads `i18n.language` (JS
evaluates function-parameter defaults at call time, not at module load, so
this isn't frozen either).

Test added: `src/utils/__tests__/format.test.ts` → `describe('locale-duyarlı
biçimlendirme...')`, three cases proving `formatPrice`/`formatPriceNumber`/
`formatRelativeDate` render differently under `tr` vs `en` (grouping
separator, and abbreviated vs full month name).

I deliberately did **not** touch `formatCondition`/`formatOrderStatus`/
`formatProductStatus`/`formatShipmentStatus`/`formatTradeStatus`/
`formatOfferStatus` — they already accept an explicit `locale` argument and
already produce correct EN/TR text either way (both languages hardcoded in
each function, not module-scope, not the frozen-at-import defect class).
Confirmed via `git grep` that none of these six functions has a caller
outside this file and its own test suite — pure parity-test surface, no
runtime screen depends on them. Left as-is to avoid unnecessary
churn/breakage of the `par-format-parity.test.ts` suite for zero visible
benefit.

## Non-React modules — how each was handled

Per `paytrDirectForm.ts`'s pattern: `import i18n from '@/i18n/config'` at
the top, `i18n.t(key)` called **inside** functions (never at module scope).
Applied to: `format.ts`, `phone.ts`, `formatApiErrorMessage.ts`,
`contentFilter.ts`, `guestRestrictions.ts`, `googleSignin.ts`,
`appleSignin.ts`. `productFilters.ts`'s `buildSortOptions`/
`buildConditionOptions` instead take `t: TFunction` as an argument (matching
the file's pre-existing convention for `buildConditionOptions`), resolved
by each React consumer via `useMemo(() => buildSortOptions(t), [t])`.

One subtlety: `src/ui/components/DateField.tsx` is a React **component**
(uses `useTranslation()` for its copy), but its locale-metadata read
(`i18n.language`, for the `Intl`/native-picker locale, not text) uses the
global `i18n` instance directly rather than `useTranslation()`'s `i18n`.
Reason: several screen tests mock `react-i18next` as `() => ({ t: (k) =>
k })` — no `i18n` property — and destructuring `useTranslation().i18n.language`
there throws. Confirmed by running `app/settings/__tests__/edit-profile.test.tsx`
before/after.

## Copy vs. matcher — where I did NOT touch behavior

- `src/utils/phone.ts`: `TR_PHONE_REGEX`, `stripTrPrefixes`, `countryCodes[].code/.country`
  are behavior — untouched. `countryCodes[].name` (Türkiye, ABD/Kanada, …)
  is display copy but **confirmed dead** (no consumer renders it — the
  country picker was removed per the file's own comment); left untranslated
  and noted rather than guessed at.
- `src/utils/contentFilter.ts`: all seven `PATTERNS[].regex` entries are
  matchers, untouched. Only `label`/`labelKey` (display) and the
  `getViolationMessage`/`formatMessagePreview` strings moved to the catalog.
- `src/services/sentryScrub.ts`: the `password`/`token`/`iban`/… field-name
  list is a scrub matcher against object keys, not copy — left alone.

## Module-scope freeze fixes (rule 4)

Beyond the ones the task named directly (`ReputationBadge.tsx`,
shipping/status helpers — the latter two were **already** correctly
migrated by an earlier slice, no work needed):

- `src/utils/guestRestrictions.ts` — `RESTRICTION_MESSAGES` (title/message
  per `GuestAction`) was a frozen TR literal map → `RESTRICTION_KEYS`
  (catalog-key references only) + call-time `i18n.t()` in
  `getRestrictionMessage`.
- `src/utils/productFilters.ts` — `SORT_OPTIONS` had the identical defect
  class as `buildConditionOptions` was already fixed for (comment above it
  says so) → `buildSortOptions(t)`.
- `src/components/ForceUpdateGate.tsx` — its own comment said "single
  source (mobile i18n sweep, #216, migrates it)" for the frozen `COPY`
  object; this is that migration.
- `src/components/ReputationBadge.tsx` — `REPUTATION_CONFIG`/
  `RECOGNITION_CONFIG` → `build*Config(t)` factories.

## Keys: reused vs added

**Reused (identical text, no wording change unless noted):**
`common.genericError`, `common.phone`, `common.email`, `common.cancel`,
`common.login`, `common.submit`, `common.selectPlaceholder` (new, see
below), `product.share`, `product.addToFavorites`, `product.signInToFavorite`,
`product.trade`, `product.sortNewest/Oldest/Popular/PriceLow/PriceHigh/HighestRating`,
`product.sortBy`, `product.shipping`, `message.sendMessage`,
`message.photoLabel`, `collection.createCollection`, `review.submit`,
`review.communication`, `review.titleOptional`, `nav.newListing`,
`profile.follow`, `profile.rating`, `seller.cancel`, `auth.createAccount`,
`auth.birthDatePlaceholder`, `validation.invalidPhone`, `listing.loginRequiredTitle`,
`mobile.errorSomethingWrong`, `mobile.errorBoundaryDescription`, `mobile.errorRetry`.

**Added (no existing match):** `common.selectPlaceholder`,
`common.showPassword`/`hidePassword`, `message.violationLabel*` (7) +
`message.violationDetected`, `guestRestriction.*` (10),
`mobile.forceUpdateTitle/Description/Button`, `reputation.*` (12),
`shareModal.*` (14), `ratingModal.*` (17), `listing.loginRequiredMessage`,
`auth.googleNotConfigured`/`googleIdTokenMissing`/`appleIdentityTokenMissing`.

## Wording changes from reuse (rule 1 — every one, and where it surfaces)

1. **`PHONE_INVALID_MESSAGE`** dropped its `" (5XX XXX XX XX)"` format hint
   when reused as `validation.invalidPhone`. Surfaces wherever the shared
   phone-invalid message renders: `app/settings/addresses`,
   `app/settings/edit-profile`, `app/settings/security`,
   `app/checkout` (guest phone + inline shipping/billing address phone),
   and `PhoneInput`'s own `validateOnBlur` fallback. Fixed the two
   `register-business` tests that asserted the old text (found by grepping
   the literal string, not just the import name — the first pass missed
   these).
2. **`ErrorState`'s default message**: `"İçerik yüklenemedi. Lütfen tekrar
   deneyin."` → `"Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."`
   (reused `mobile.errorBoundaryDescription`). Surfaces on every screen that
   renders `<ErrorState/>` without an explicit `message` prop:
   `offers/[id]`, `sales/[id]`, `trade/counter/[id]`, `brands/index`,
   `ureticiler/index`.
3. **`SORT_OPTIONS`'s price labels**: `"Fiyat (Düşük)"`/`"Fiyat (Yüksek)"`
   → `"Fiyat (Düşükten Yükseğe)"`/`"Fiyat (Yüksekten Düşüğe)"` (reused
   `product.sortPriceLow`/`sortPriceHigh`). Surfaces on the Search tab sort
   sheet, the Listings sort sheet, and the Search results bar's sort
   button.

No other reuse changed visible wording — all other reused keys had text
identical to what the source literal already said.

## Left because I could not tell copy from matcher

None. Every ambiguous case in this slice (phone regexes, content-filter
patterns, sentry scrub keys, country-code data) was resolvable by reading
what the code actually *compares* the string against vs. what it *displays*
— documented per-file above.

## Gates

- `npx tsc --noEmit` → clean (0 errors) at every commit checkpoint.
- `npx eslint . --ext .ts,.tsx` → **0 errors**, 1107 warnings (tracked
  baseline ~1106; the +1 is pre-existing `any`/unused-var noise in files
  this slice touched, not a new category introduced by this work).
- `npx jest` (full 210 suites, default parallelism) → flaky under this
  machine's load: first run 23 suites / 34 tests failed, all with
  `Exceeded timeout of 5000 ms` and no assertion text in the failure (pure
  CPU contention). Reran full suite with `--testTimeout=20000`: **8 suites
  / 8 tests failed**, still every failure a bare timeout before the test
  body's real assertions ran, spread across checkout/brands/settings/
  membership suites unrelated to this slice's files. Reran those exact 8
  suites in isolation (`--testTimeout=15000`, no contention): **9 suites /
  34 tests, 100% pass** (the checkout-coupon-quote suite has more tests
  than distinct failures listed). Conclusion: environmental flakiness from
  running the whole suite in one process, not a regression — every suite
  this slice's changes could plausibly affect passes cleanly whenever run
  without contention. catalog-integrity, phone/validation/contentFilter/
  format/RatingModal/register-business suites verified green individually
  multiple times during the slice, including after every wording-affecting
  change.

## Commits

12 commits, one (or a small tight group) per file/concern, each preceded by
`node scripts/gen-keys.mjs` where the catalog changed:

```
4e8372a i18n(shared): fix format.ts locale hardcoding, add tr/en assertion
bb20ab3 i18n(shared): translate phone/validation/contentFilter messages
8943712 i18n(shared): translate guestRestrictions.ts prompts
c2f1a4b i18n(shared): fix productFilters.ts SORT_OPTIONS module-scope freeze
a6a4a63 i18n(ui): translate DateField.tsx, fix its own tr-TR locale hardcode
88e6dd3 i18n(ui): translate ErrorState, Select, Input primitives
ab226c4 i18n(app): wire up ErrorBoundary and ForceUpdateGate
8e95557 i18n(app): translate ReputationBadge.tsx label maps
4cebfb4 i18n(app): translate ShareModal.tsx
5b3a11c i18n(app): translate RatingModal.tsx (live: orders/index, orders/[id])
80cb287 i18n(app): translate AuthRequiredSheet.tsx
4db71bf i18n(services): translate thrown-error messages in google/appleSignin.ts
```
