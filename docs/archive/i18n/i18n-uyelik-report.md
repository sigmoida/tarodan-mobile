# i18n — Membership / Premium Slice Report

Branch: `feat/i18n-uyelik`, based on `6b1e32d`.

## Scope covered

- `src/utils/membershipLimits.ts` (shared, non-hook module)
- `src/hooks/useMembershipLimits.ts` — read in full; no user-facing strings, nothing to change
- `app/membership/manage/_hooks/useMembershipManage.ts`
- `app/membership/manage/_lib/types.ts`
- `app/membership/manage/_components/ManageSections.tsx`
- `app/membership/manage/index.tsx`
- `app/membership/checkout/_lib/tiers.ts`
- `app/membership/checkout/_hooks/useMembershipCheckout.ts`
- `app/membership/checkout/_components/CheckoutSections.tsx`
- `app/membership/checkout/index.tsx`
- `app/membership/success.tsx`
- `app/membership/_hooks/useMembership.ts`
- `app/membership/_lib/membershipTiers.ts`
- `app/membership/_components/MembershipSections.tsx`
- `app/upgrade.tsx` — read in full; a `<Redirect>` only, no strings
- `src/components/UpgradePrompt.tsx` — already fully migrated (correct `build<Name>(t)` pattern), nothing to change
- `src/components/PremiumBadge.tsx`
- `app/settings/subscription/index.tsx`
- `app/settings/subscription/_components/SubscriptionBody.tsx`
- `app/settings/subscription/_hooks/useSubscription.ts` — already fully migrated, only one call site updated for the `t` param added to `getSubscriptionStatusText`
- `app/settings/subscription/_lib/subscription.ts`

Also touched, outside the named slice, because they are direct callers of a
function I changed the signature of (`getUpgradeMessage`) or of a route-local
`_lib` I changed the signature of (`formatBillingPeriod`/`getSubscriptionStatusText`):
- `app/trade/new/_components/NewTradeGate.tsx` — one line (`getUpgradeMessage(t, 'tradeFeature')`), added `useTranslation`. Rest of file's Turkish left untouched (out of scope).
- `app/collections/new/_components/NewCollectionGates.tsx` — same, one line + import.

Tests updated: `app/membership/__tests__/index.test.tsx`, `visibility.test.tsx`,
`success.test.tsx`, `app/settings/__tests__/subscription.test.tsx`,
`app/settings/subscription/_lib/__tests__/subscription.test.ts`.

## Keys: reused vs added

**Added:** 87 new keys under `membership.*` (84 in the first batch, +2 badge
keys, +1 `paymentOverdue`), all with parallel TR/EN values, verified against
`catalog-integrity.test.ts` (skeleton, order, non-empty, no accidentally-identical
value outside the allowlist).

**Reused** (partial list — the ones worth flagging):
- `membership.free/premium/business` (existing) for tier names throughout.
- `membership.freeMembership/premiumMembership` (existing, exact match) for the
  manage screen's tier labels.
- `membership.featureDigitalGarage`, `membership.featureTrade`,
  `membership.featureUnlimitedListings`, `membership.unlimited`,
  `membership.autoRenew`, `membership.changePlan`, `membership.cancelMembership`,
  `membership.cancelTitle`, `membership.manageMembership`,
  `membership.upgradeToPremium`, `membership.mostPopular`, `membership.upgrade`,
  `membership.currentPlan`, `membership.monthly/yearly`, `membership.perMonth/perYear`,
  `membership.prioritySupport`.
- `upgradePrompt.listingLimitTitle/Message`, `upgradePrompt.featureListingTitle/Message`,
  `upgradePrompt.messageLimitTitle/Message`, `upgradePrompt.imageLimitTitle/Message`,
  `upgradePrompt.tradeFeatureMessage`, `upgradePrompt.collectionFeatureMessage`,
  `trade.featureTitle` — `getUpgradeMessage` in `membershipLimits.ts` was the
  untranslated twin of `UpgradePrompt.tsx`'s already-migrated `buildPromptConfig`;
  reused the same keys for the same concepts.
- `address.limitTitle` / `address.limitBody` (already carries `{max}` ICU) for
  the `addressLimit` upgrade-gate case.
- `common.cancel`, `common.logout`, `common.tryAgain`, `common.active`,
  `common.cancelled`, `common.total`, `common.popular`, `common.new`,
  `common.unknown`, `common.login`.
- `discount.startLabel` / `discount.endLabel` ("Başlangıç"/"Bitiş") for the
  manage screen's period key-value rows.
- `listing.actionFailed` for generic mutation-error snackbars.
- `checkout.paymentMethod`, `checkout.orderSummary`, `checkout.processing`.
- `footer.terms`, `footer.privacy`, `footer.corporate` (business tier's member
  label — "Kurumsal").
- `error.goHome` for the success screen's "go home" button.
- `offer.statusExpired` for the subscription "expired" status text.

### Wording changes from reuse (all deliberate — listed per the brief)

1. **`getUpgradeMessage` messages** (`membershipLimits.ts`): the five message
   strings for `listingLimit/tradeFeature/collectionFeature/featureListing/
   messageLimit/imageLimit` now render the `upgradePrompt.*` wording instead
   of their own near-duplicate sentences (e.g. "Sınırsız ilan vermek için
   Premium üyeliğe geçin." → "Ücretsiz üye olarak en fazla 10 ilan
   verebilirsiniz."). Same concept, different copy; this function had **no
   real callers exercising these five cases** (only `tradeFeature` and
   `collectionFeature` are actually invoked in the app, from the two gate
   components), so the risk is low, and it kills a maintenance trap (two
   near-identical premium-upsell copy decks that could drift).
2. **`imageLimit` title**: "Resim Limiti" → "Fotoğraf Limiti" (reused
   `upgradePrompt.imageLimitTitle`).
3. **`useMembershipManage.ts` auto-renew mutation errors / cancel errors**:
   now use `listing.actionFailed` ("İşlem başarısız.") instead of a
   locally-duplicated identical string — no visible wording change, pure
   dedup.
4. **`ManageSections.tsx` "Vazgeç" → "İptal" (`common.cancel`)**: the dialog
   cancel-style button previously said "Vazgeç"; now says "İptal" like every
   other cancel button in the app (offers, listings, addresses, product,
   report modal all already use `common.cancel`). Intentional consistency fix.
5. **`useMembership.ts` "Çıkış yap" → "Çıkış Yap" (`common.logout`)**: case
   normalization only.
6. **Business tier name: "Business" → "İş"** — this is the most significant
   finding. Three different files hardcoded three different labels for the
   business tier:
   - `app/membership/_lib/membershipTiers.ts` (main `/membership` screen): `'Business'`
   - `app/membership/checkout/_lib/tiers.ts` (checkout): `'İş'`
   - `app/membership/manage/_lib/types.ts` (manage screen): `'Business Üyelik'`
   - `app/membership/success.tsx` (post-purchase): `'Business'`

   The catalog's existing `membership.business` key (already used by
   checkout, pre-dating this slice) says `"İş"` in Turkish (`"Business"` in
   English). I standardized every one of these four files on
   `membership.business` / the new `membership.businessMembership`
   ("İş Üyelik"), so a user now sees the same business-tier name on the
   plans screen, the checkout screen, the manage screen, and the
   post-purchase screen. Before this fix the business tier's displayed name
   silently changed as the user moved through the funnel — a real, if minor,
   parity bug, not just a translation nit. Updated the assertion in
   `app/membership/__tests__/success.test.tsx` (J14.S1) from `/Business
   üyeliğiniz/` to `/İş üyeliğiniz/` accordingly, with a comment explaining
   why.
7. **`membershipTiers.ts` `TIER_LIMITS`/tier-feature numbers**: no wording
   change, but see "Numbers moved into ICU arguments" below for how the
   "10 ilan"/"5 resim"/"15 resim" bullet strings were wired to
   `FREE_MEMBER_LIMITS`/`PREMIUM_MEMBER_LIMITS`.

### Brand-token vs ordinary-noun decisions

- `membership.premium` — already on `INTENTIONALLY_IDENTICAL` (unchanged,
  confirmed in `catalog-integrity.test.ts`); left as a brand term everywhere
  it's the *display* of the `'premium'` literal.
- `'premium'`/`'basic'`/`'business'`/`'free'` as **data** (branch conditions,
  API params, style-map keys) were left untouched everywhere — only their
  *display* labels route through `t()`. Verified with `grep` that no
  `tier === 'business'`/`tierType`/`billingPeriod`/`status` comparison was
  accidentally translated.
- `"İşletme"/"Business"` example from the brief: this codebase already chose
  `"İş"` as the Turkish business-tier label (pre-existing catalog key,
  `checkout/_lib/tiers.ts`). I did not introduce a new translation decision
  here — I propagated the codebase's own existing decision consistently (see
  wording-change #6 above) rather than picking a fresh translation myself.
- New key `membership.basic` = "Temel"/"Basic" — an ordinary noun, translated,
  no ambiguity (parallel to the existing `membership.free`).

## Numbers moved into ICU arguments

Every feature-list count is now an ICU `{count}` argument, not baked into a
sentence:

- `membership.tierLimitListings`/`tierLimitPhotos` ("{count} ilan"/"{count}
  resim") — used by `membershipTiers.ts`'s `buildTierFeatures` and
  `useMembership.ts`'s `getListingLimit`.
- `membership.tierFeatureFreeListings`/`TotalListings`/`FeaturedListings`
  ("{count} ücretsiz ilan"/"{count} toplam ilan"/"{count} öne çıkan ilan") —
  shared verbatim between `checkout/_lib/tiers.ts`'s `buildMembershipTiers`
  and `success.tsx`'s `buildTierFeatures`, so the checkout screen and the
  post-purchase screen can't drift on these numbers independently (they used
  to be two separately-hand-typed literal arrays with the same numbers).
- `membership.photoCountFeature` ("{count} Fotoğraf") in
  `SubscriptionBody.tsx`.
- `membership.daysCount` / `membership.expiringWarningTitle` ("{count}
  gün"/"Aboneliğiniz {count} gün sonra sona erecek") in `SubscriptionBody.tsx`.
- `membership.discountBadge` ("%{percent} indirim").
- `membership.checkoutMoreFeatures` ("+{count} daha fazla").

### Numbers wired to the actual constant (not just ICU-ified)

- `membershipTiers.ts`'s `buildTierFeatures`: the free tier's "10 ilan" and
  "5 resim" now come from `FREE_MEMBER_LIMITS.maxListings` /
  `FREE_MEMBER_LIMITS.maxImagesPerListing`; the premium tier's "15 resim"
  comes from `PREMIUM_MEMBER_LIMITS.maxImagesPerListing`. Previously these
  were separately hand-typed literals that happened to match the constants.
- `SubscriptionBody.tsx`'s "15 Fotoğraf" now comes from
  `PREMIUM_MEMBER_LIMITS.maxImagesPerListing`.
- `getUpgradeMessage('addressLimit')` now interpolates
  `FREE_MEMBER_LIMITS.maxAddresses` into `address.limitBody`'s existing
  `{max}` argument instead of the old flat sentence "Daha fazla adres
  kaydetmek için Premium üyeliğe geçin." (which never mentioned a number).

### Hardcoded numbers that duplicate a constant but were **not** wired (flagged, not fixed)

- `membershipTiers.ts`'s basic tier "10 resim" and business tier "20 resim":
  there is **no `BASIC_MEMBER_LIMITS`/`BUSINESS_MEMBER_LIMITS` constant** in
  `membershipLimits.ts` to wire them to — only `FREE_MEMBER_LIMITS` and
  `PREMIUM_MEMBER_LIMITS` exist. These two numbers live only in the catalog
  call (`{ count: 10 }` / `{ count: 20 }`), same as before my change, just now
  going through ICU instead of a raw string. Said so explicitly in a code
  comment above `buildTierFeatures`.
- `app/membership/checkout/_lib/tiers.ts`'s `business.price = 499` vs.
  `DEFAULT_MONTHLY.business = 249.99` (same file) and
  `membershipTiers.ts`'s `getDefaultMonthly('business') = 249.99`: a
  **pre-existing** discrepancy (not introduced or touched by me — I preserved
  the value verbatim). `tier.price` is read as a fallback
  (`DEFAULT_MONTHLY[tierType] ?? tier.price`) but `DEFAULT_MONTHLY` always has
  all three tier keys defined, so this fallback path is dead code in
  practice; flagging in case someone relies on `tier.price` directly later.

## Shared modules (`membershipLimits.ts`, `useMembershipLimits.ts`)

- `src/utils/membershipLimits.ts` is imported by a zustand-adjacent utility
  module, not a hook/component. `getUpgradeMessage`, `getTierDisplayInfo`, and
  `formatLimit` all now take `t: TFunction` as their **first** argument
  instead of resolving text internally. Confirmed (via `grep`) their only
  real callers: `NewTradeGate.tsx` and `NewCollectionGates.tsx` for
  `getUpgradeMessage` (both updated to pass a live `t` from
  `useTranslation()`); `getTierDisplayInfo`/`formatLimit` have **no callers**
  anywhere in the app except the module's own default-export object — I
  still converted their signatures for consistency and to pre-empt the
  "frozen at import time" trap the brief warns about, since they're public
  exports that could be picked up later.
- `src/hooks/useMembershipLimits.ts` fetches `GET /membership/me/limits` and
  writes the result into `authStore`. It contains **no user-facing strings**
  at all (confirmed by reading the whole file) — nothing to translate here.
- `app/settings/subscription/_lib/subscription.ts` is the same shape of
  problem: a route-local `_lib` (not a hook), so `formatBillingPeriod` and
  `getSubscriptionStatusText` now take `t` as their first argument. Both
  callers updated (`useSubscription.ts`, `SubscriptionBody.tsx`).
- `app/membership/_lib/membershipTiers.ts` and
  `app/membership/checkout/_lib/tiers.ts` and `app/membership/manage/_lib/types.ts`:
  all converted from module-level `Record<...>` constants to
  `build<Name>(t: TFunction)` factories, each called with
  `useMemo(() => build...(t), [t])` at the one call site that needs a memoized
  object (`useMembership.ts`, `useMembershipCheckout.ts`), or inline in render
  where the cost is negligible (`MembershipSections.tsx`'s `TierCard`,
  `success.tsx`).

## `periodLabel` / `billingPeriod` — display value doing double duty as a comparison

Found in `useMembershipCheckout.ts`: `periodLabel` was the raw Turkish
literal `'yıl'`/`'ay'`, and `CheckoutSections.tsx`'s `OrderSummary` compared
`periodLabel === 'yıl'` to decide whether to show "Yıllık" or "Aylık" — a
display string being used as a branch condition, the exact anti-pattern the
brief calls out for tier values. Fixed by having the hook expose the real
`billingPeriod: 'monthly' | 'yearly'` value (already computed, just not
returned before) for comparisons, and deriving `periodLabel` purely for
display via `membership.perMonth`/`perYear`. `OrderSummary` now branches on
`billingPeriod === 'yearly'`, never on translated text.

## Apostrophe check

Turkish possessive apostrophes in the two new catalog values I authored that
contain them:
- `membership.checkoutPaymentInfo`: `"...Tarodan''a kaydedilmez... PayTR''nin
  3D Secure..."`
- `membership.checkoutTermsSuffix`: `"''nı kabul etmiş olursunuz."`

Both doubled (`''`) per the house rule. Verified explicitly with
`intl-messageformat` (the library `i18next-icu` wraps) directly in this repo:

```
$ node -e "
const {IntlMessageFormat} = require('intl-messageformat');
console.log(new IntlMessageFormat(\"''nı kabul etmiş olursunuz.\", 'tr').format());
console.log(new IntlMessageFormat(\"Tarodan''a kaydedilmez\", 'tr').format());
console.log(new IntlMessageFormat(\"PayTR''nin 3D Secure ödeme sayfası açılır.\", 'tr').format());
"
"'nı kabul etmiş olursunuz."
"Tarodan'a kaydedilmez"
"PayTR'nin 3D Secure ödeme sayfası açılır."
```

All three render with a single, correct apostrophe — confirmed the doubling
produces the intended output rather than swallowing the rest of the string.
(Also checked: EN catalog values never double apostrophes, e.g. existing
`auth.noAccount = "Don't have an account?"` — matches the pattern I followed:
double only in Turkish.)

No `t('...a')`/`t('...'nın)`-shaped new key was left un-doubled; grepped the
diff for stray single quotes before committing each batch.

## Tests updated

- `app/membership/__tests__/index.test.tsx`, `visibility.test.tsx`: both mock
  `useTranslation` as `t: (k) => k` (identity). Once `TIER_NAMES`/
  `MembershipBanners` text started routing through `t()`, assertions had to
  move from the old Turkish literals ("Temel", "Premium", "Mevcut Planınız",
  "Aylık", "Yıllık", "Yükselt", "Business", the loadError sentence, the
  pending-payment banner text) to the corresponding **key** strings
  (`membership.basic`, `membership.premium`, `membership.currentPlan`,
  `membership.monthly`, `membership.yearly`, `membership.upgrade`,
  `membership.business`, `membership.loadError`,
  `membership.pendingPaymentTitle`/`Subtitle`). Confirmed this is the
  established house convention by checking `app/settings/__tests__/security.test.tsx`
  and `app/settings/__tests__/subscription.test.tsx`, which already assert on
  keys like `"security.enabled"`/`"membership.upgradeToPremium"` for exactly
  this reason.
- `app/membership/__tests__/success.test.tsx`: **real catalog** is used here
  (no `react-i18next` mock in this file), so most assertions kept working
  unchanged. Only J14.S1's business-tier assertion needed updating, from
  `/Business üyeliğiniz.../` to `/İş üyeliğiniz.../` — this is the wording fix
  described above (#6), not a mock artifact.
- `app/settings/__tests__/subscription.test.tsx`: same identity-mock pattern;
  updated "Giriş Yapın" → `membership.loginRequiredTitle`, "Aboneliği İptal
  Et" (×4) → `membership.cancelTitle`, and the `/gün sonra sona erecek/`
  regex → `membership.expiringWarningTitle` (the mock doesn't interpolate
  ICU args, so the regex could never match the real rendered sentence again).
- `app/settings/subscription/_lib/__tests__/subscription.test.ts`: pure-logic
  test for `formatBillingPeriod`/`getSubscriptionStatusText`, now called with
  `schemaT` from `@/test-utils/schema.ts` (real catalog, TR locale) — no
  assertion text changed, since the catalog's TR values are identical to what
  was hardcoded before.

## Gate results

- `npx tsc --noEmit` — clean, no errors (both mid-slice and at the end).
- `npx eslint . --ext .ts,.tsx` — **0 errors**, 1107 warnings (same as the
  unmodified `6b1e32d` baseline — verified by running eslint on the clean
  pre-change tree; the one pre-existing `MembershipLimits` unused-import
  warning in `membershipLimits.ts` predates this slice, confirmed via `git
  show 6b1e32d:src/utils/membershipLimits.ts`).
- `npx jest` (full suite) — **210 suites / 1671 tests**, 1669 → 1670 passed
  (1 pre-existing, unrelated failure: `app/cart/__tests__/cart-selection.test.tsx`
  "tümünü seç kutusu tüm satırları geri getirir" times out in the full run but
  passes cleanly in isolation — confirmed with `git diff --stat 6b1e32d HEAD
  -- app/cart` showing zero changes touched cart files; this is pre-existing
  test-isolation flakiness, not something this slice introduced).

## Incident note

Mid-session, a `git stash` / `git stash pop` pair (used to isolate which file
was causing a test hang) accidentally popped **another agent's** pre-existing
stash entry (`"On feat/i18n-support-trade: pre-existing uncommitted
support/trade i18n (not mine)"`) onto this worktree, since `git stash` is
repository-global, not worktree-local. Caught immediately via `git status`,
and re-stashed with the identical message before doing anything else — no
commit, edit, or test run touched that content. Flagging so the owning agent
knows their stash is intact and untouched.
