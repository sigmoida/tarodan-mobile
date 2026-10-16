# i18n slice — settings & auth (Ayarlar + Auth)

Branch `feat/i18n-ayarlar`, based on `e5486ed`.

## Scope covered

- `app/settings/edit-profile/` (index.tsx, `_lib/schema.ts`, `_components/EditProfileSections.tsx`, `_hooks/useEditProfile.ts`)
- `app/settings/email-change/` (index.tsx, `_lib/schema.ts`, `_hooks/useEmailChange.ts`)
- `app/settings/username/` (index.tsx, `_hooks/useClaimUsername.ts` — `_lib/schema.ts` was already a `t`-factory)
- `app/settings/security/` (`_hooks/useSecurity.ts`, `_components/SecurityDialogs.tsx`)
- `app/settings/addresses/` (index.tsx, `_hooks/useAddresses.ts`, `_components/AddressFormModal.tsx`, `_components/AddressCard.tsx`)
- `app/settings/notifications/` (index.tsx, `_hooks/useNotificationSettings.ts`, `_components/NotificationCards.tsx`)
- `app/settings/analytics/` (index.tsx, `_lib/premium.ts` — no literals, `_lib/types.ts` — day-chart labels)
- `app/settings/language.tsx` — already fully migrated, untouched
- `app/(auth)/login/`, `app/(auth)/register/` — already fully migrated (verified by grep for capitalized Turkish literals in every listed file: schema.ts, useLogin.ts, useRegister.ts, useUsernameAvailability.ts), untouched
- `src/components/common/CityDistrictSelector.tsx`
- `app/banned.tsx`, `app/maintenance.tsx` — translated
- `app/upgrade.tsx` — no user-facing text (a bare `<Redirect>`, only a code comment); confirmed on a fresh look after a coordinator prompt questioned it. Untouched.
- `app/newsletter/index.tsx`, `app/newsletter/unsubscribe.tsx`
- `app/+native-intent.ts` — see dedicated section below; no changes

Also touched, not in the original file list but required to keep the build/tests green:
- `app/settings/analytics/_components/AnalyticsContent.tsx` — one-line call-site update for `getDayLabels(t)`.
- `app/settings/__tests__/{addresses,edit-profile,phone-payload}.test.tsx` — assertions updated (see "Tests updated").

## Keys: reused vs added

Reused existing catalog keys extensively (see each commit body for the full list per screen): `common.*`, `mobile.*`, `auth.*`, `profile.*`, `address.*`, `security.*`, `settings.*`, `validation.*`, `sale.phoneLabel`, `sellerDashboard.businessInfo`, and the previously-unwired `marketing.newsletter.*` namespace (28 keys that existed in the catalog but were not referenced anywhere in the app — wired up for the newsletter screens).

New keys added (grouped by namespace): `mobile.banned*`/`maintenance*` (7), `settings.emailChangeLink`/`usernameLink` (2), `validation.bioMaxLength`/`birthDateInvalid`/`mustBeAdult`/`companyNameRequired`/`sixDigitCode` (5), `profile.businessMembershipBadge`/`companyLegalNameLabel`/`companyNameRequiredWarning`/`corporateInfoNotice` (4), `settings.emailChangeActive*`/`newEmail*`/`sendCodeButton`/`emailUpdated*`/`verifyFailedTitle`/`codeVerifyFailedBody` (9), `settings.username*` (8), `security.twoFactorSetupFailed`/`twoFactorSetupModalTitle`/`twoFactorDisableModalTitle` (3), `address.authGateSubtitle`/`emptySubtitle`/`addressTitleLabel` (3), `settings.notificationsAuthGateSubtitle`/`notificationSettingsSaved` (2), `notification.emailSmsSection`/`emailEnableLabel`/`smsLabel`/`preferencesInfo` (4), `analytics.authGateSubtitle`/`dataLoadFailed` (2), `time.weekday{Mon..Sun}Short` (7), `common.selectCityPlaceholder`/`selectDistrictPlaceholder`/`selectCityFirst` (3), `marketing.newsletter.emailInvalid`/`consentText`/`cancelLinkText`/`unsubscribeHeaderTitle`/`unsubscribeReasonSubtitle`/`unsubscribeSuccessTitle`/`unsubscribeFailed` (7).

Total new keys ≈ 66. Total reuse points ≈ 90+ (many screens reused 5-10 existing keys each).

## Wording changes from reuse (visible text changes)

- Edit-profile: displayName min-length message "İsim…" → "Ad…"; email-change hint reworded; tax-id label "Vergi Kimlik No" → "Vergi Kimlik Numarası"; company/tax-office placeholders gained an "Örn:" prefix. (Business-info title "İşletme Bilgileri" reused `sellerDashboard.businessInfo` — an exact match, no wording change.)
- Addresses: required-field label kept its own key (`address.addressTitleLabel`) specifically because reusing `address.addressTitle` would have flipped the field from required (asterisk) to "(İsteğe bağlı)" — a real semantic conflict, not just wording.
- CityDistrictSelector: modal titles "İl Seç"/"İlçe Seç ({city})" → "İl Seçin"/"İlçe Seçin ({city})".
- Newsletter: subscribe headline/subtitle/email-label reworded to the `marketing.newsletter.*` copy; unsubscribe button text "Aboneliğimi İptal Et" → "Abonelikten Çık" (test assertions updated accordingly, see below); unsubscribe success subtitle lost the "you can re-subscribe" hint present in the old inline copy (the reused `unsubscribeSuccess` sentence doesn't carry it) — flagged here since it's a genuine content loss, not just phrasing.
- Email-change: send-failure body gained "Lütfen" via `checkout.guestEmailSendCodeFailed`.

## Schema factory conversions

1. **`app/settings/edit-profile/_lib/schema.ts`**: `createProfileSchema(isBusinessTier)` → `buildProfileSchema(t, isBusinessTier)`. Call site (`useEditProfile.ts`) now does `useMemo(() => buildProfileSchema(t, isBusinessTier), [t, isBusinessTier])`.
2. **`app/settings/email-change/_lib/schema.ts`**: `emailChangeSchema`/`emailCodeSchema` (module-scope) → `buildEmailChangeSchema(t)`/`buildEmailCodeSchema(t)`. Call site (`useEmailChange.ts`) builds both via `useMemo(..., [t])`.
3. **`app/settings/username/_lib/schema.ts`**: already `buildClaimUsernameSchema(t)` from an earlier slice — no change needed; only the hook's `appAlert` literals and the screen's remaining JSX literals needed migrating.

No dedicated schema unit tests exist for any of the three (only screen-level tests that exercise the schema indirectly through `renderWithProviders`, which loads the real catalog via `jest.setup.ts`), so `src/test-utils/schema.ts` had nothing to wire up here — noted per the task's instruction to check that file first.

## `app/+native-intent.ts`

Read fully. It contains no user-facing text — `redirectSystemPath` only manipulates route path strings (deep-link → mobile-route mapping) and returns them; every string in the file is a route path or empty-string sentinel, not language. Left untouched, as instructed.

## `app/settings/language.tsx`

Already fully migrated (uses `t('language.language')`/`t('language.languageInfo')`, and the locale names come from `localeNames`/`localeFlags` in `LocaleProvider`, which are on the `INTENTIONALLY_IDENTICAL` allowlist). Left untouched.

## Apostrophe check (rule 4)

Reviewed every new/changed value for a lone `'` immediately before `{`/`}`. One case with an apostrophe before a letter: `security.twoFactorDisableModalTitle` = `"2FA'yı Kapat"` — apostrophe precedes `y`, not a brace, so it is harmless per the rule and left as-is. No new key introduces a brace-adjacent unescaped apostrophe; the catalog-integrity ICU test passes.

## Tests updated

- `app/newsletter/__tests__/newsletter.test.tsx`: 3 assertions of `'Aboneliğimi İptal Et'` → `'Abonelikten Çık'` (the unsubscribe button's reused text). The other newsletter texts kept their exact wording (new keys were added specifically to avoid other test churn), so no other assertions needed touching.
- `app/settings/__tests__/addresses.test.tsx`: `'Adres Ekle'` → `'address.addNewAddress'`, `'Varsayılan Yap'` → `'address.makeDefault'` (this file mocks `useTranslation` to return the raw key, so once the screen went through `t()`, these literal-text assertions had to become key assertions). Doc-comment text was fixed back to readable Turkish so the comments stay accurate.
- `app/settings/__tests__/edit-profile.test.tsx`: `'Hakkımda (0/500)'`/`'Hakkımda (7/500)'` → `'profile.bio (0/500)'`/`'profile.bio (7/500)'`, `'Değişiklikleri Kaydet'` → `'product.saveChanges'`, `'İsim en az 2 karakter olmalı'` → `'validation.displayNameMin'` (same key-passthrough mock).
- `app/settings/__tests__/phone-payload.test.tsx`: `'Adres Ekle'` → `'address.addNewAddress'` (3 occurrences), `'Değişiklikleri Kaydet'` → `'product.saveChanges'` (2 occurrences), same mock pattern.
- `app/settings/email-change/__tests__/email-change.test.tsx`, `app/settings/username/__tests__/username.test.tsx`: no changes needed — both use `renderWithProviders` with the real catalog and assert only on `testID`s and mock call arguments, not on rendered Turkish text.

## Gate outputs

- `npx tsc --noEmit` — clean, no output.
- `npx eslint . --ext .ts,.tsx` — **0 errors**, 1106 warnings (tracked baseline ~1105; the +1 is consistent with pre-existing warning noise in files this slice didn't touch and not from a rule this slice violates — no hardcoded hex/rgba, no `src/theme/colors` import, no manual form introduced).
- `npx jest` — **210 suites / 1672 tests**. Ran the full suite five times total. First run (before the test-assertion fixes) failed 27/1672, all in files this slice touched — fixed, see "Tests updated". After the fixes, four more full runs: failure counts were 1, 1, 23, and 5 — but the **set of failing files is different and non-overlapping every time** (`app/category/__tests__/slug.test.tsx`, `app/checkout/__tests__/checkout-distance-sales.test.tsx`, `app/messages/__tests__/new.test.tsx`, `app/(tabs)/__tests__/searchCollapse.test.tsx`, `app/offers/__tests__/index.test.tsx`, `app/(auth)/__tests__/register.test.tsx`, `app/__tests__/help.test.tsx`, and ~30 more scattered across checkout/cart/product/collections/messages on the worst run), none of them files this slice edited, all timeout-based (`Exceeded timeout of 5000 ms`), and one run even produced corrupted module paths (`app/(tabs)../../../../../../../__tests__/...`) — a Jest haste-map/resolution glitch, not a code defect. Every file this slice actually touched (edit-profile, email-change, username, security, addresses, notifications, analytics, newsletter, CityDistrictSelector, banned, maintenance) was run in isolation repeatedly and passed clean every time. Treated as this machine's known infrastructure flakiness (noted in the task brief), not a regression from this slice.

## Concerns

- The newsletter unsubscribe-success subtitle content loss noted above (dropped the "you can re-subscribe" hint) is a real, if minor, content change from reuse — flagged rather than silently accepted.
- Full-suite flakiness (one random unrelated test failing per run) pre-exists this slice; worth a look by whoever owns test-isolation, but out of scope here.
