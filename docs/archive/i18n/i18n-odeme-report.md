# i18n — Payment / Checkout Slice Report

Branch: `feat/i18n-odeme`, based on `70d5b9e` (merge: i18n for the membership family).

## Scope covered

- `src/components/CardPaymentForm.tsx`
- `app/payment/success.tsx`
- `app/payment/[id].tsx`
- `app/payment/fail.tsx`
- `app/settings/payment-methods.tsx`
- `app/settings/payments/index.tsx`
- `app/settings/payments/_lib/status.ts`
- `app/settings/payments/_components/PaymentCard.tsx`
- `app/settings/payment-history/index.tsx`
- `app/settings/payment-history/_lib/status.ts`
- `app/settings/payment-history/_hooks/usePaymentHistory.ts`
- `app/settings/payment-history/_components/PaymentHistoryItem.tsx`
- `app/checkout/_hooks/useCheckout.ts` (already mostly migrated in an earlier pass; found and fixed 4 remaining bare-literal spots)
- `app/checkout/_lib/validation.ts`
- `app/checkout/_lib/constants.ts` (read in full — nothing to translate, see below)
- `app/checkout/_lib/types.ts` (read in full — pure DTOs, no strings)
- `app/checkout/index.tsx`
- `app/checkout/success.tsx`
- `app/checkout/_components/OrderSummary.tsx`
- `app/checkout/_components/CouponInput.tsx`
- `app/checkout/_components/AddressSelector.tsx`
- `app/checkout/_hooks/useCoupon.ts` (read in full — already fully migrated via the global `i18n.t()`, nothing to change)
- `app/checkout/_modals/OtpModal.tsx`
- `src/lib/payment/paytrDirectForm.ts`

Also touched, outside the named slice, because it asserted on text this
slice changed:
- `app/settings/__tests__/payment-history.test.tsx` — a test file that lives
  outside `app/settings/payment-history/` (an earlier per-route `find`
  missed it; the full `npx jest` run caught it). Updated one assertion for
  the `payment.noHistory` reuse wording change (see below).
- `src/i18n/__tests__/catalog-integrity.test.ts` — added
  `payment.expYearPlaceholder` to `INTENTIONALLY_IDENTICAL` (see apostrophe/
  identical-value section).

## Keys: reused vs added

**Added:** 93 new keys, almost all under `payment.*` and `checkout.*` (the
two namespaces the brief named to extend), all with parallel TR/EN values.

**Reused** (partial list — the ones worth flagging):
- `common.error`, `common.ok`, `common.cancel`, `common.remove`, `common.apply`,
  `common.default`, `common.all`, `common.success`, `common.completed`,
  `common.pending`, `common.login`, `common.continue`, `common.goBack`,
  `common.amount`, `common.status`.
- `checkout.cvv`, `checkout.securePayment`, `checkout.title`, `checkout.paymentDetail`,
  `checkout.zipCode`.
- `payment.statusPending`, `payment.statusProcessing`, `payment.confirmingTitle`,
  `payment.retry`, `payment.startFailed`, `payment.defaultCard`,
  `payment.cardGenericBrand` (added this slice, then reused across
  `CardPaymentForm` and `payment-methods.tsx`), `payment.threeDSCancel` (added
  then reused for the delete-card dialog's cancel button),
  `payment.orderNumberFallback` (added then reused with different ICU
  argument names in two different files).
- `order.statusPaid`, `order.statusCompleted`, `order.statusRefunded`,
  `order.statusRefundInProgress`, `order.orderNumber`, `order.order`.
- `trade.backToTrade`.
- `auth.goToHome`, `auth.bizPhone`, `auth.emailVerification`.
- `membership.loginRequiredTitle`.
- `mobile.settingsPayments`, `mobile.settingsPaymentHistory`.
- `listing.loginRequiredTitle`.
- `cart.priceUnavailableTitle`, `cart.continueShopping`.
- `footer.corporate`.
- `security.verificationCodeLower`.

### Wording changes from reuse (all deliberate — listed per the brief)

1. **`payment/success.tsx` "Siparişimi Gör" → "Siparişimi Görüntüle"**
   (reused `payment.viewMyOrder`). Updated `success.test.tsx` assertions
   (3 occurrences) accordingly.
2. **`payment-history/index.tsx` "Ödeme geçmişiniz bulunmuyor" →
   "Henüz ödeme geçmişiniz bulunmuyor"** (reused `payment.noHistory`, adds
   "Henüz"). Caught by the full `npx jest` run via
   `app/settings/__tests__/payment-history.test.tsx` (J89.1) — updated.
3. **`payment-history/index.tsx` "Yaptığınız ödemeler burada
   listelenecektir" → "Yaptığınız ödemeler burada listelenecek."** (reused
   `payment.noPaymentsSubtitle`, drops the "-tir" verb suffix, adds a
   period). No test asserted on it.
4. **`payment-history/index.tsx` "Ödeme geçmişinizi görmek için giriş
   yapın" → "...giriş yapın."** (reused `payment.myPaymentsLoginSubtitle`,
   adds a trailing period only). No test asserted on it.
5. **`payments/_components/PaymentCard.tsx` "Yeniden Dene" → "Tekrar
   Dene"** (reused `payment.retry`, consistent with every other retry
   button in the payment surface). No dedicated test file exists for this
   route (verified via `find`).

All five are same-meaning consistency fixes across near-duplicate copy
that had drifted; none soften or change what the user is being told to do.

## Status maps → `build<Name>(t)` factories

Per the brief's rule 2, every module-scope label map found was converted:
- `app/payment/success.tsx`: `STATUS_LABELS` → `buildStatusLabels(t)`.
- `app/settings/payment-methods.tsx`: `CARD_TYPE_LABELS` → `buildCardTypeLabels(t)`.
- `app/settings/payments/_lib/status.ts`: `STATUS_OPTIONS`/`STATUS_COLORS` →
  `buildStatusOptions(t)`/`buildStatusColors(t)`.
- `app/settings/payment-history/_lib/status.ts`: `STATUS_CONFIG` →
  `buildStatusConfig(t)`.

Two non-React modules follow the existing `validation.ts` precedent
(module-level `import i18n from '@/i18n/config'` + `i18n.t()` instead of
`useTranslation()`, since they can't call hooks):
- `app/checkout/_lib/validation.ts` (already partly on this pattern; finished
  converting the remaining `${label} adresi için...` template strings to ICU
  `checkout.address{CityRequired,DistrictRequired,FullNameRequired,
  LineRequired,PhoneRequired,PhoneInvalid}` keys).
- `src/lib/payment/paytrDirectForm.ts` (new to this pattern — see below).

## Data left untouched (never translated)

- **`STOCKOUT_KEYWORDS`** in `app/checkout/_lib/constants.ts` — a list of
  Turkish substrings (`'satışta değil'`, `'stokta yok'`, …) matched against
  server error messages via `.toLowerCase().includes(...)` in
  `useCheckout.ts` (lines ~725, ~795). This is data the code compares
  against, not UI text — left exactly as-is.
- Card brand names (`c.brand`, e.g. "Visa"/"Mastercard"/"Troy") — always
  rendered verbatim from the API; only the **fallback** string ("Kart"/
  "Card", shown when `c.brand` is null) was translated
  (`payment.cardGenericBrand`).
- Provider names ("PayTR") and "3D Secure" — never translated, per the
  brief.
- Error codes (`'PAYTR_BAD_ACTION'`, `'ECONNABORTED'`, `'EMAIL_ALREADY_REGISTERED'`,
  etc.), payment status values (`'completed'`/`'pending'`/…), and
  idempotency-key generation — all left as data.
- `formatDate`/`formatCurrency` locale in both `payments/_lib/status.ts` and
  `payment-history/_lib/status.ts` — **deliberately** kept hardcoded
  `'tr-TR'` (see next section) rather than switched to the active UI
  language.

## A change I made then reverted (reported per the brief)

I initially changed `payments/_lib/status.ts`'s `formatDate` to accept `t`
and use `t('common.dateLocale')` instead of hardcoded `'tr-TR'`, threading
`t` through the one call site in `PaymentCard.tsx`. On reflection this was
inconsistent: `@/utils/format.formatPrice` — the shared money formatter used
throughout the app, well outside this slice's file list — hardcodes
`'tr-TR'`/`'TL'` for **all** money formatting regardless of UI language.
Changing only this one date formatter's locale, while every amount on the
same card stays `tr-TR`-formatted via `formatPrice`, would have been a
half-applied decision outside the "text only" mandate for this money-code
slice, not a coherent i18n choice. I reverted it (commit `ee095a7`) back to
the original hardcoded `'tr-TR'` and kept only the label translations
(status text, filter labels). `payment-history/_lib/status.ts`'s
`formatDate`/`formatCurrency` were written the same way from the start
(never changed).

## Nothing refused for control-flow reasons

Every literal in scope was a pure text swap (`title="X"` → `title={t('key')}`,
`appAlert('Title', 'msg')` → `appAlert(t('key1'), t('key2'))`, a label map
promoted to a `build<Name>(t)` factory). No `appAlert`/`alertAfterOtpClose`/
`alertInlineWhileOtpOpen` call site's arguments, ordering, or timing were
touched, no modal-close-before-alert sequencing was touched, and
`useCheckout.ts`'s branches (PayTR/bypass/stockout, guest OTP, idempotency,
commission/pricing-conflict retry) are byte-for-byte the same control flow —
only 4 bare `'Hata'`/hardcoded-template literals inside existing `appAlert`
calls were swapped for `t(...)` calls at the exact same call sites.

## Apostrophe check (rule 5)

Ran a full diff-scoped grep over every value this slice added to
`tr.json`, checking every `'` occurrence: all three literal apostrophes I
introduced (`processingMaybeBody`, `verifyTimeoutBody`, `sslNotice`, all
quoting "Siparişlerim"/`Tarodan'a`) are correctly doubled (`''`) — verified
with `git diff 70d5b9e -- src/i18n/lib/catalog/tr.json | grep "'" | grep -v "''"`,
which returned **no matches**. Also checked `en.json`: the English
convention in this catalog is to double quote marks around a quoted
UI-element name too (pre-existing precedent: `ticketCreated`, all the
`information.howItWorks.*` step keys use `''My Orders''`/`''Buy Now''`
etc.), so `processingMaybeBody`/`verifyTimeoutBody` follow that pattern in
English as well; plain English contractions ("they're", "we've",
"couldn't") were left as single apostrophes, matching every other EN value
in the catalog.

## `payment.expYearPlaceholder` — intentionally identical

Added to `catalog-integrity.test.ts`'s `INTENTIONALLY_IDENTICAL` allowlist:
the card-expiry placeholder "YY" (2-digit year hint) is the same string in
both languages — there's no word to translate, same rationale as the
pre-existing `checkout.cvv` exemption.

## Tests updated

- `app/payment/__tests__/success.test.tsx` — 3 assertions,
  `'Siparişimi Gör'` → `'Siparişimi Görüntüle'` (wording-change #1 above).
- `app/settings/__tests__/payment-history.test.tsx` — 1 assertion (J89.1),
  `'Ödeme geçmişiniz bulunmuyor'` → `'Henüz ödeme geçmişiniz bulunmuyor'`
  (wording-change #2 above; this file lives outside
  `app/settings/payment-history/` so my earlier per-route `find` missed it
  — only the final full `npx jest` run caught it).
- `src/i18n/__tests__/catalog-integrity.test.ts` — added the
  `payment.expYearPlaceholder` exemption.

No other test files needed changes: every other reuse was either an exact
string match, or new copy with no prior test coverage (verified via `grep`/
`find` per file before moving on — see individual commit messages for the
grep output referenced in each).

## Gate outputs (final, on the full slice)

- `npx tsc --noEmit` → clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` → **0 errors**, 1106 warnings (within the
  ~1107 tracked baseline).
- `npx jest` → **210 suites / 1671 tests, all green** — matches the
  pre-slice target exactly (the two failures found on the first full run —
  the `expYearPlaceholder` identical-value gate and the
  `payment-history.test.tsx` wording assertion — were both fixed and are
  described above).

## Commits on `feat/i18n-odeme` (base `70d5b9e`)

```
7bd2cc7 feat(i18n): translate CardPaymentForm
86e2fd3 feat(i18n): translate payment success screen
fb601e1 feat(i18n): translate payment/[id] screen
51944f8 feat(i18n): translate payment fail screen
1a7c0cf feat(i18n): translate saved payment methods screen
152a14e feat(i18n): translate payments list screen
ee095a7 fix(i18n): keep payment date formatting on tr-TR
db5703f feat(i18n): translate payment history screen
75c348a feat(i18n): translate checkout address validation messages
9166a1e feat(i18n): finish translating useCheckout controller
051e895 feat(i18n): translate checkout screen and success screen
70072e5 feat(i18n): translate checkout components (summary, coupon, address, OTP modal)
ffbcd15 feat(i18n): translate PayTR direct-form security error messages
df62aa5 fix(i18n): close gate failures found by the full test/catalog run
```
