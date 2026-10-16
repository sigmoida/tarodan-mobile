# i18n slice report — static information & legal pages

Branch `feat/i18n-bilgi-sayfalari`, based on `6b1e32d`. Covers all 15 files
in the brief: `security-features.tsx`, `buyer-protection.tsx`,
`guvenli-takas.tsx`, `(tabs)/_lib/infoPages.ts`, `size-guide.tsx`,
`shipping-delivery.tsx`, `payment-options.tsx`, `returns-exchanges.tsx`,
`(tabs)/_lib/legalPages.ts`, `sayfa/[slug].tsx`, `distance-sales.tsx`,
`privacy.tsx`, `refund-policy.tsx`, `seller-agreement.tsx`, `cookies.tsx`.

This slice was interrupted three times by infrastructure faults (the
machine sleeping / connection loss), never by a problem with the work
itself. Per the coordinator's standing instruction, everything after the
first commit was committed one or two files at a time rather than in one
batch, specifically so a fourth interruption would lose at most a file or
two of progress.

## Keys: reused vs added

- 275 new keys added to both `tr.json` and `en.json` (verified by diffing
  the flattened key sets against `6b1e32d`).
- Reuse (all confirmed by grepping the catalog for the exact string before
  writing anything new):
  - `infoPages.ts`: all 12 `INFO_PAGES` labels and all 3 `LEGAL_PAGES`
    labels reuse existing `mobile.pageXxx` / `footer.intellectualProperty`
    keys — **zero new keys** for those 15 labels. Only `ACCOUNT_PAGES`
    (`following`, `newsletter`) needed two new keys
    (`mobile.settingsFollowing`, `mobile.settingsNewsletter`).
  - `security-features.tsx`: reused `mobile.pageSafeTrade` and
    `information.security.dataPrivacy` for two feature titles (exact
    matches; their descriptions differ from those generic, web-shared
    `information.*` keys, so descriptions got their own
    `securityFeatures.*` entries rather than forcing a mismatched reuse).
  - `buyer-protection.tsx`: reused `mobile.pageRefundPolicy`,
    `mobile.pageReturns`, `legal.termsTitle` for the three footer links.
  - `shipping-delivery.tsx`: reused `information.shipping.methods/.costs/
    .times` for three of four section **titles only** — titles are
    exact-text matches with the existing (web-shared) `information.*`
    keys; the paragraph content differs (this screen names specific
    figures/wording the generic web copy doesn't), so content got its own
    `shippingDeliveryPage.*Content` keys.
  - `returns-exchanges.tsx`: reused `mobile.pageRefundPolicy` and
    `information.returns.process`.
  - `payment-options.tsx`: reused `mobile.pagePaymentOptions`.
  - `sayfa/[slug].tsx`: reused `common.loading`, `common.error`,
    `common.tryAgain`, `common.goBack`.
  - The five full-length legal pages (`distance-sales`, `privacy`,
    `refund-policy`, `seller-agreement`, `cookies`) all share one date
    banner text ("Son güncelleme: 1 Ocak 2026") — pulled into a single
    shared key, `legalContact.lastUpdatedJan2026`, instead of five
    duplicates. A shared `legalContact.*` namespace
    (`emailLabel`/`phoneLabel`/`addressLabel`/`contactLabel`, each
    `"<Label>: {value}"`) also covers the "E-posta: X" / "Telefon: X" /
    "Adres: X" / "İletişim: X" lines that recur across `security-features`,
    `distance-sales`, `privacy`, `refund-policy`, `seller-agreement`, and
    `cookies` — all ICU-interpolated, never concatenated.

### Every wording change from reuse (as required)

- `guvenli-takas` menu label: "Güvenli Takas Sistemi" → "Güvenli Takas"
  (reusing `mobile.pageSafeTrade`).
- `shipping-delivery` menu label: "Kargo ve Teslimat" → "Teslimat ve Kargo"
  (reusing `mobile.pageShipping`).
- `security-features` menu label: "Güvenlik" → "Güvenlik Özellikleri"
  (reusing `mobile.pageSecurityFeatures`).

All other reuses above are exact-text matches with no visible wording
change (`guides`, `size-guide`, `buyer-protection`, `returns-exchanges`,
`refund-policy`, `payment-options`, `distance-sales`, `seller-agreement`,
`intellectual-property`, `privacy`, `terms`, `cookie-policy` menu labels;
all `legalContact.*` reuses; the `information.shipping.*`/`.returns.*`/
`security.dataPrivacy` title reuses; the `common.*` reuses in
`sayfa/[slug].tsx`).

## Module-scope arrays → `build<Name>(t)` factories

`app/(tabs)/_lib/infoPages.ts` (`INFO_PAGES`, `ACCOUNT_PAGES`) and
`app/(tabs)/_lib/legalPages.ts` (`LEGAL_PAGES`) were frozen module-level
constants. Converted to `buildInfoPages(t)`, `buildAccountPages(t)`,
`buildLegalPages(t)` factories, mirroring the existing
`buildQuickActionItems(t)` pattern in `profileConstants.ts`. The sole
caller, `ProfileMenuSections` in `app/(tabs)/_components/ProfileSections.tsx`,
now calls all three inside the component body with its live `t` from
`useTranslation()` — never at module scope. Every screen file in this
slice with its own local FEATURES/STEPS/SCALES/sections array
(`security-features`, `buyer-protection`, `guvenli-takas`, `size-guide`,
`shipping-delivery`, `payment-options`, `returns-exchanges`) got the same
treatment: a `use<Name>(t: TFunction)` helper called from inside the
screen component, never a module-level constant.

Three call sites imported the old frozen arrays directly and needed
updating to call the factories with the real i18n instance:
`app/(tabs)/__tests__/infoPagesMenu.test.ts`,
`app/(tabs)/__tests__/profileMenuLinks.test.tsx`, and
`app/(tabs)/__tests__/legalPagesMenu.test.tsx` (the third one was missed
in the first pass and caught only during the `tsc` gate — see "Bug found"
below).

## Apostrophe check

Every apostrophe in every new TR *and* EN catalog value across all 14 new
namespaces (`legalContact`, `securityFeatures`, `buyerProtectionPage`,
`safeTradePage`, `sizeGuidePage`, `shippingDeliveryPage`,
`paymentOptionsPage`, `returnsExchangesPage`, `cmsPage`,
`distanceSalesPage`, `privacyPage`, `refundPolicyPage`,
`sellerAgreementPage`, `cookiesPage`) was verified programmatically: a
script stripped every doubled `''` and asserted no single `'` remained.
Zero hits. The legal contract text (`ALICI'nın`, `SATICI'ya`, etc.) is
the densest use of apostrophes in the slice and is doubled throughout
(e.g. `"İşbu sözleşme, ALICI''nın SATICI''ya ait..."`).

Beyond the static string check, a throwaway render test (written,
executed, then deleted — not part of any commit) rendered
`DistanceSalesScreen` through the real i18next+ICU pipeline and asserted
the output contains no literal `''` and does show
`"ALICI'nın SATICI'ya ait"` with single apostrophes — confirming the ICU
escaping round-trips correctly at runtime, not just in the JSON source.

## Legal clauses kept structurally Turkish

None. All five legal documents (distance-sales contract, privacy policy,
refund policy, seller agreement, cookie policy) were translated into
natural English throughout — no clause needed to keep Turkish sentence
structure to preserve its legal commitment. Figures, deadlines, and
percentages were carried across as ICU arguments or literal numbers,
never altered:

- `RETURN_REQUEST_DAYS` / `REFUND_PAYOUT_DAYS` / `DAMAGE_REPORT_DAYS` →
  ICU `{days}` arguments (distance-sales, refund-policy,
  returns-exchanges), replacing the original template-literal
  concatenation.
- Fixed figures not backed by a shared constant (30-day delivery window,
  2-business-day seller review, 3-business-day shipment/payout windows in
  the seller agreement, the 5% starting commission, KVKK Law No. 6698,
  Law No. 6502, the Distance Contracts Regulation) — carried across as
  literal numbers/citations in both languages, unchanged.
- `LEGAL_ENTITY` fields (legal name, tax/MERSİS number, address, email,
  phone) in `distance-sales.tsx` and `LEGAL_ENTITY.legalName` in
  `seller-agreement.tsx` are passed as ICU arguments and never
  translated/paraphrased — only their TR labels (Unvan/Vergi-MERSİS/
  Adres/E-posta/Telefon) became English labels
  (Legal Name/Tax No.-MERSİS/Address/Email/Phone).
- The seller agreement's commission paragraph previously interpolated the
  shared `COMMISSION_SUMMARY` constant from `legalFacts.ts` via template
  literal. Folded both sentences into one
  `sellerAgreementPage.s5Content` catalog key (rather than two `t()`
  calls joined by a raw space) so word order is a translation decision,
  not a runtime concatenation. `legalFacts.ts` itself is untouched;
  `COMMISSION_SUMMARY` still exists for its other consumers (`faq.tsx`,
  `help/_lib/faq.ts`), which are outside this slice and still render the
  Turkish string directly — a pre-existing gap, not introduced here.

Proper nouns and product facts (Tarodan, Sürat Kargo, PayTR, iyzico,
Visa/Mastercard/Troy, Google Analytics, Facebook Pixel, Hotjar, scale
notations like `1:18`/`1:64`, cm/kg/₺ units and brand names in
`size-guide.tsx`) were carried across unchanged in both locales.

## Bug found and fixed: TypeScript checker crash

Six of the `use<Name>(t)` helpers were typed with a hand-rolled signature
(`t: (key: string, opts?: Record<string, unknown>) => string`) instead of
importing `TFunction` from `i18next`. Passing the real, heavily overloaded
`t` from `useTranslation()` into that narrower type crashed `tsc` outright
("Debug Failure: No error for last overload signature") rather than
reporting a normal type error — `npx tsc --noEmit` aborted with a stack
trace instead of exiting non-zero with diagnostics.

Bisected with disposable `git worktree` checkouts across every commit on
this branch to confirm `6b1e32d` compiles clean and the crash was
introduced by this slice, then narrowed it to the pattern. Fixed
`buyer-protection.tsx`, `guvenli-takas.tsx`, `size-guide.tsx`,
`shipping-delivery.tsx`, `payment-options.tsx`, and
`returns-exchanges.tsx` to use `TFunction` — the same pattern already
established in `profileConstants.ts`'s `buildQuickActionItems`.

## Tests updated

- `app/(tabs)/__tests__/infoPagesMenu.test.ts` — now calls
  `buildInfoPages(i18n.t)` / `buildAccountPages(i18n.t)` /
  `buildLegalPages(i18n.t)` instead of importing frozen arrays. Assertions
  unchanged (they check `route`/`icon`/label-length, not literal wording).
- `app/(tabs)/__tests__/profileMenuLinks.test.tsx` — same change; asserts
  on `route`, unaffected by wording.
- `app/(tabs)/__tests__/legalPagesMenu.test.tsx` — same change; asserts on
  `slug` and label length, unaffected by wording. (Missed in the first
  pass, caught by the `tsc` gate.)
- `app/__tests__/static-pages.test.tsx` was reviewed — it covers
  `about.tsx`/`faq.tsx`/`guides.tsx`, none of which are in this slice, and
  needed no changes.
- No other test file imports any of the 15 migrated screens directly
  (confirmed by grep for each screen's default export name across
  `app/__tests__` and route-local `__tests__` folders).

## Gate outputs

- `npx tsc --noEmit`: clean, 0 errors (after the `TFunction` fix above).
- `npx eslint . --ext .ts,.tsx`: **0 errors**, 1106 warnings — matches the
  tracked baseline exactly.
- `npx jest`: **210 suites passed / 210 total, 1671 tests passed / 1671
  total**. Run from inside this worktree with no extra
  `testPathIgnorePatterns` needed — `npx jest --listTests` independently
  confirmed exactly 210 test files are discovered from this rootDir, so
  no sibling agent worktrees are being picked up.
