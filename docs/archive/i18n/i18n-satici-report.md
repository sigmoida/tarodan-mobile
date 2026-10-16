# i18n — seller / business-application slice

Branch `feat/i18n-satici`, based on `70d5b9e`. Work landed in 7 commits, one per
file cluster, to survive the machine's frequent mid-run faults.

## Scope covered

- `app/seller/register.tsx`
- `app/seller/dashboard/index.tsx`, `_components/DashboardSections.tsx`
- `app/seller/[id]/index.tsx`, `_lib/constants.ts`, `_components/SellerTabs.tsx`,
  `_components/SellerProfileCard.tsx` (`_hooks/useSellerProfile.ts` had no
  user-facing literals — only a debug `console.log` and comments — left as is)
- `app/settings/business-application/` — `index.tsx`, `_hooks/useBusinessApplication.ts`,
  `_hooks/useDocumentUpload.ts`, `_modals/AppealModal.tsx`, `_lib/schema.ts`,
  `_sections/DetailsTab.tsx`, `_sections/DocumentsTab.tsx`,
  `_sections/StakeholdersTab.tsx` (`_lib/documents.ts` was already on the
  `labelKey` pattern — no changes needed)
- `app/settings/business/index.tsx`, `_hooks/useBusinessStats.ts`
  (`_components/BusinessRows.tsx` / `BusinessSections.tsx` were already fully
  migrated by prior work — verified, not touched)
- `app/business-pending.tsx`, `app/business-rejected.tsx`
- `app/ureticiler/index.tsx`, `app/ureticiler/[slug].tsx`
- `app/(auth)/register-business/_components/RegisterBusinessForm.tsx`
  (`_hooks/useRegisterBusiness.ts` and `_lib/schema.ts` were already fully
  migrated by prior work — verified, only 4 leftover literals in the form
  component needed translating)

## Keys: reused vs added

Added roughly **116 new catalog keys** across `seller.*` (+30),
`sellerDashboard.*` (+15), a new `businessApplication.*` namespace (47),
`business.*` (+4), a new `businessGuard.*` namespace (14), `product.*` (+3),
`auth.*` (+3). Reused **~25 existing keys** instead of duplicating, including
`common.loading/goBack/user/error/send/submit/add/replace/genericError/login/logout`,
`nav.messages/manufacturers`, `product.noListings/sendMessage/searchManufacturers/manufacturer`,
`review.noReviews`, `payment.itemsCount`, `address.city/district`,
`bankAccount.ibanInvalid/tcknInvalid`, `sellerDocument.upload`,
`membership.upgrade`, `checkout.contactInfo`, `search.tryDifferent`,
`collection.productsLoadFailed`, `common.noResults`. I considered reusing
`mobile.quickBusinessApplication` ("Kurumsal Başvuru") for the
business-application screen header but kept a fresh
`businessApplication.headerTitle` with identical text instead, since the
route's own namespace also needed to hold the three tab labels and keeping
the header alongside them made the namespace self-contained.

### Wording changes from reuse (as required to report)

- `sellerDashboard.title` = "Satıcı Panosu" now shown where the screen literal
  was "Satıcı Paneli" (dashboard `ScreenHeader`/loading/login-gate titles).
- `sellerDashboard.quickActions` = "Hızlı Aksiyonlar" now shown where the
  literal was "Hızlı İşlemler".
- `bankAccount.ibanInvalid` ("Geçerli bir TR IBAN giriniz (TR + 24 rakam)")
  now shown where the business-application IBAN field's inline message was
  "IBAN TR ile başlayıp 24 rakam içermeli".
- `bankAccount.tcknInvalid` ("...11 rakam olmalı") now shown where the
  stakeholder identity-number message was "...11 hane olmalı" — "hane" (digit
  place) → "rakam" (digit), same meaning.
- `search.tryDifferent` ("Farklı anahtar kelimeler deneyin", plural, no
  period) now shown where the manufacturers-search empty-state subtitle was
  "Farklı bir anahtar kelime deneyin." (singular, "bir", period).
- `collection.productsLoadFailed` ("Ürünler yüklenemedi", no period) now
  shown where the manufacturer-detail error message was "Ürünler
  yüklenemedi." (period).

None of these change the meaning; all are same-intent phrasing already
established elsewhere in the catalog, chosen over minting a near-duplicate key.

## Schema factory conversions (rule 2)

- `app/settings/business-application/_lib/schema.ts`: `applicationDetailsSchema`,
  `stakeholderSchema`, `appealSchema` (module-scope) → `buildApplicationDetailsSchema(t)`,
  `buildStakeholderSchema(t)`, `buildAppealSchema(t)`. Callers updated:
  `useBusinessApplication` builds `buildApplicationDetailsSchema(t)` /
  `buildStakeholderSchema(t)` inline (component already re-renders on language
  change since `t` comes from `useTranslation` at the top of the hook);
  `AppealModal` builds `buildAppealSchema(t)` the same way.
- `app/(auth)/register-business/_lib/schema.ts` (`buildRegisterBusinessSchema`)
  and `_hooks/useRegisterBusiness.ts` were already converted by earlier work
  (confirmed via `useMemo(() => buildRegisterBusinessSchema(t), [t])`); no
  schema test exists for this route beyond `__tests__/schema.test.ts`, which
  already passes.
- No route-local schema test file exists for `business-application` (only
  `useBusinessApplication.test.tsx` and `screen.test.tsx`, which exercise the
  schemas indirectly through the real catalog via `renderWithProviders` /
  `renderHook` — both pass).

## Label maps → `labelKey` (rule 3)

- `app/seller/[id]/_lib/constants.ts` (`BADGE_INFO`): `label: string` (module-scope
  Turkish text) → `labelKey: MessageKey`. Consumers (`SellerProfileCard.tsx`)
  now call `t(info.labelKey)` at render time instead of reading a frozen string.
  Badge codes (`fast_shipper`, `trusted_seller`, ...) are the API's stable
  values and were left untouched — only the label moved to the catalog.
- `app/settings/business-application/_lib/documents.ts` (`DOCUMENT_TYPES`,
  `IDENTITY_DOCUMENT_TYPES`, `DOCUMENT_STATUS_CONFIG`) was already on this
  exact pattern from prior work — verified, no changes needed.

## Legal/compliance document names (rule 1 of the three special items)

I did not need to introduce or rename any document-type or status label —
`sellerDocument.*` (tax plate, signature circular, trade registry gazette,
activity certificate, identity/passport front/back, status labels) already
existed with EN equivalents that read as genuine English regulatory terms
("Trade Registry Gazette", "Signature Circular", "Activity Certificate") and
were not touched. I have no outstanding uncertainty about any legal document
name in this slice — the mapping (`_lib/documents.ts`) was already correct and
unchanged.

## Values left untranslated (data, not language)

- `BADGE_INFO`/`DOCUMENT_TYPES`/`DOCUMENT_STATUS_CONFIG` keys (`fast_shipper`,
  `tax_plate`, `pending`, ...) — API values, left as-is; only their labels
  route through the catalog.
- Business application status checks (`under_review`, `rejected`,
  `revision_requested`, `appealed`) in `useBusinessApplication.ts` — untouched,
  compared against server data.

## Apostrophe check (rule 6)

Ran a script over every value in every namespace I added or edited
(`seller`, `sellerDashboard`, `businessApplication`, `business`,
`businessGuard`, `product`'s three new keys, `auth`'s three new keys) checking
for a single (non-doubled) `'`. Result: **0 matches** — none of my added
strings contain an apostrophe at all, so there was nothing to double. I did
not touch any pre-existing catalog entry's apostrophe escaping (several
already exist elsewhere in the catalog, correctly doubled, e.g.
`auth.step2FindEmail => "Tarodan''dan gelen e-postayı bulun"` — untouched by
this slice).

## Tests

- No existing route-local test in this slice's scope asserted on Turkish
  text that I changed the wording of via reuse (the two `search.tryDifferent`
  / `collection.productsLoadFailed` reuses are in `app/ureticiler/`, which has
  no test file).
- `app/settings/business-application/__tests__/{screen,useBusinessApplication}.test.tsx`
  (14 tests, real-catalog render via `renderWithProviders`) — pass unchanged,
  because the reused/new TR strings I chose match what those tests assert on
  (e.g. `expect(screen.getByText(/Başvuru bulunamadı/i))` matches the new
  `businessApplication.notFoundTitle` = "Başvuru bulunamadı").
- `app/(auth)/register-business/__tests__/{phone,schema,register-business}.test.tsx`
  (69 tests) — pass unchanged.
- Added two entries to `src/i18n/__tests__/catalog-integrity.test.ts`'s
  `INTENTIONALLY_IDENTICAL` exemption list, each with an inline reason:
  `seller.trustScoreLevelSuffix` (" · {level}" — pure separator + interpolation)
  and `businessApplication.ibanLabel` ("IBAN" — international abbreviation,
  genuinely identical in both languages).

## Gate outputs (final, on the full branch)

- `npx tsc --noEmit` → clean, 0 output.
- `npx eslint . --ext .ts,.tsx` → **0 errors**, 1106 warnings (at/under the
  ~1107 tracked baseline).
- `npx jest` → **210 suites / 1671 tests, all passing** (matches the target
  exactly).

## Commits

```
fcd4d0c i18n: seller register + dashboard screens
4bc9c43 i18n: seller public profile screen (app/seller/[id])
ecd02b9 i18n: settings/business-application (details, stakeholders, documents, appeal)
c777281 i18n: settings/business dashboard (index + useBusinessStats)
8a6d982 i18n: business-pending / business-rejected guard screens
66f1ede i18n: manufacturers listing (app/ureticiler)
f16da35 i18n: register-business form intro/section literals
```
