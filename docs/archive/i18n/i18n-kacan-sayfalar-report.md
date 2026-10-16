# i18n kaçan sayfalar — legal & info pages slice

Branch: `feat/i18n-kacan-sayfalar` (based on `5a34f6c`).

## Scope

- `app/terms.tsx`
- `app/intellectual-property.tsx`
- `app/platform-hizmet-bedeli.tsx`
- `app/help/_components/HelpFaq.tsx`

The measurement script given in the task only catches single-line matches (quoted
literals and single-line JSX text nodes). All four files also had multi-line JSX
text blocks (`<Text>...\n...\n</Text>`) that the script's regex cannot span. Since
I read every file in full before editing, all Turkish text was migrated —
including headings without diacritics that the diacritic-gated regex misses
(e.g. `2. Marka ve Logo`) and a placeholder string with no diacritics
(`"Soru veya konu ara..."` in `HelpFaq.tsx`).

## Keys reused vs added

Reused (no new key, no wording change):
- `legalContact.lastUpdatedJan2026`, `legalContact.emailLabel`,
  `legalContact.addressLabel` — same wrapper pattern already used by
  `privacy.tsx` / `cookies.tsx`.
- `information.contactInfo.addressValue` ("İstanbul, Türkiye" / "Istanbul,
  Turkey") — reused for both `terms.tsx` and `intellectual-property.tsx`
  address lines instead of adding a duplicate `locationValue` per page.
- `common.login`, `footer.sell`, `mobile.guestOrderTrack`, `faq.title` —
  reused verbatim in `HelpFaq.tsx` for "Giriş Yap" / "Satış Yap" / "Sipariş
  Takip" / "Sıkça Sorulan Sorular" (exact existing wording, confirmed by
  diffing the TR value before reuse).

Added (no exact existing match):
- `termsPage.*` (32 keys) — `terms.tsx` section titles/content/list items.
- `ipPage.*` (27 keys) — `intellectual-property.tsx` section titles/content.
- `platformFeePage.*` (19 keys) — `platform-hizmet-bedeli.tsx` sections,
  including `s6Content` as an ICU template with `{email}` (was string
  concatenation with `SUPPORT_EMAIL` before).
- `legalContact.lastUpdatedJun2026` — the fee page's date line ("2 Haziran
  2026") differs from the Jan-2026 date every other legal page uses, so it
  needed its own value under the same `legalContact.*` naming convention
  rather than a new one-off page-local key.
- `mobile.pagePlatformFee` — the fee page's `ScreenHeader` title was a raw
  string literal (`title="Platform Hizmet Bedeli"`), not wired through
  `useTranslation` at all; added alongside the existing `mobile.page*` family
  and switched the screen to `t()`.
- `helpFaq.searchTitle`, `helpFaq.searchPlaceholder` — "Nasıl yardımcı
  olabiliriz?" and "Soru veya konu ara..." have no exact match elsewhere
  (`help.subtitle` / `faq.searchPlaceholder` are close but differently
  worded, so left alone rather than force a reuse that would change copy).

Total: **10 keys reused, ~79 keys added** (all through `add()` calls to both
`tr.json`/`en.json` in the same order, keeping the two catalogs' key order
identical per `catalog-integrity.test.ts`).

## Legal-text fidelity

`terms.tsx`, `intellectual-property.tsx`, and `platform-hizmet-bedeli.tsx`
were translated clause-by-clause with no summarizing, softening, or figure
changes. All numbers (48-hour takedown window, 48-hour order-completion
window) and the deliberately-vague commission language in
`platform-hizmet-bedeli.tsx` (already hedged in the Turkish source — see the
file's own code comment about the web/staging rate discrepancy) were carried
over unchanged.

## Concern found, not fixed (out of scope for this slice)

`intellectual-property.tsx` §1 (`ipPage.s1Content`) states the platform's
content is owned by **"Tarodan Teknoloji A.Ş."** — this legal entity name
does **not** match `LEGAL_ENTITY.legalName` in `src/constants/legalFacts.ts`
("Serhatlar Oyuncak Temizlik Gıda Maddeleri İnşaat Sanayi ve Ticaret Limited
Şirketi"), i.e. it is a fabricated entity name of the same kind the recent
`fix(legal)` commits on this branch's history (seller agreement, trading
entity) already corrected on other pages. Per this task's explicit rule
("do not change behaviour... only move text" / entity names are facts, not
this slice's job to correct), I preserved the existing text verbatim and only
moved it to the catalog. **Recommend a follow-up fix** to replace the
fabricated name with `LEGAL_ENTITY.legalName` here, mirroring the seller
agreement fix.

## Final measurement (should be empty)

Re-running the task's measurement script (quoted literals + single-line JSX
text) against all four files after the edits returns **no matches** — output
was empty.

## Verification run

- `npx tsc --noEmit` — clean (no new errors).
- `npx eslint . --ext .ts,.tsx` — 0 errors, 1104 warnings (baseline ~1106).
- `npx jest --testTimeout=45000` — **211 suites / 1678 tests, all green**
  (matches the required baseline exactly). Targeted suites
  (`catalog-integrity`, `platform-hizmet-bedeli`, `static-pages`, `help`)
  also passed individually before the full run.
