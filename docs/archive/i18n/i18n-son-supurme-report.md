# i18n son süpürme — report

Branch `feat/i18n-son-supurme` off `38ad03f`.

## Measurement — verify-before-trust

Ran the measurement script fresh (not the prompt's stale numbers) via a script
file (avoided bash `-e` quoting corruption of the regex) covering `app/**` and
`src/**` `.ts`/`.tsx`, excluding `__tests__` and `/i18n/`. The rerun matched the
task's file list closely (same 23 files it named individually, one exception
below), confirming the list was accurate enough to work from, modulo files
explicitly declared out of scope in the task (`status-configs.ts`, `format.ts`,
`legalFacts.ts`, `phone.ts`) and `turkeyLocations.ts`/`fixtures.ts` (place names /
test fixtures, never in scope).

**One file not in the given list that the rerun surfaced:** `src/theme/catalog.ts`
(`CONDITIONS` — "Sıfır", "Az Kullanılmış", "İyi", "Orta", "Hasarlı"). Investigated
below.

## What the 23 named files actually needed

Manually opened every hit with `grep -n -B/-A` context, not just the regex
line. The measurement script's block-comment detector only skips comments that
*start* a trimmed line with `/*` — it does **not** recognize JSX `{/* ... */}`
comments that open after other text, so a large share of "hits" across this
slice were actually inside JSX comments, unaffected by rendering. Verifying
each one individually:

| File | Hit(s) | Verdict | Reason |
|---|---|---|---|
| `useHomeData.ts` | 7 | not user-facing | all `console.log(...)` dev diagnostics in query `catch` blocks — never rendered |
| `TradeShippingSection.tsx` | 4 | not user-facing | 3 are inside `{/* ... */}` comments; "Sürat Kargo" is a carrier brand name, file already has a comment stating it's a proper noun |
| `checkout/_lib/constants.ts` | 4 | not user-facing | `STOCKOUT_KEYWORDS` — matched via `.includes()` against **backend** error text (`useCheckout.ts:725,795`), never rendered itself |
| `useNewTrade.ts` | 3 | not user-facing | same pattern — `msg.includes('Takas özelliği')` etc. against backend error text |
| `SaleDetailBody.tsx` | 2 | not user-facing | both "Sürat Kargo" — carrier brand name (one is already an ICU arg to `t('sale.shipmentSectionTitle', {carrier: ...})`) |
| `(tabs)/index.tsx` | 2 | not user-facing | `console.log` dev connectivity probe |
| `CartSummary.tsx` | 2 | not user-facing | inside a `{/* ... */}` JSDoc-style JSX comment |
| `useLogin.ts` | 2 | not user-facing | one `console.log`, one `lower.includes('doğrula')` — matched against backend error text |
| `useSellerProfile.ts` | 1 | not user-facing | `console.log` |
| `settings/business/index.tsx` | 1 | not user-facing | `f.error.includes('şirket adı')` — matched against backend error text |
| `MyListingsSections.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `settings/collections.tsx` | 1 | not user-facing | `console.log` |
| `OfferCard.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `OrderTrackResult.tsx` | 1 | not user-facing | "Sürat Kargo" — carrier brand name |
| `TradeActions.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `useProduct.ts` | 1 | not user-facing | `console.log` |
| `cart/index.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `CartItemRow.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `OrderCard.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `RegisterBusinessForm.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| `useMembershipCheckout.ts` | 1 | not user-facing | `throw new Error('Ödeme başlatılamadı...')` — caught immediately; the alert shown to the user only reads `e?.response?.data?.message \|\| t('membership.paymentErrorGeneric')`, never `e.message`, so this string only ever reaches Sentry (`captureException`), not the user |
| `UpgradePrompt.tsx` | 1 | not user-facing | inside `{/* ... */}` comment |
| **`listing/_lib/constants.ts`** | **1** | **real, fixed** | module-scope `FALLBACK_MATERIALS` array — genuine UI copy, see below |

## Real fix: `FALLBACK_MATERIALS` → `buildMaterials(t)`

`src/components/listing/_lib/constants.ts` had a module-scope array of
material-picker labels (`Diecast (Metal)`, `Resin (Reçine)`, `Composite
(Kompozit)`, `Plastic (Plastik)`) — the exact anti-pattern the file's own
`buildConditions(t)` factory (right above it) already documents: resolved once
at import time, frozen in whichever language loaded first. Confirmed a real
render path: `useListingForm.ts:628` (`effectiveMaterials = materialList.length
> 0 ? materialList : FALLBACK_MATERIALS`) feeds `ListingPickers.tsx`'s material
picker (`labelExtractor={(item) => item.label}`) when the server-driven
material list is empty.

Fix, mirroring `buildConditions(t)` exactly:
- `src/components/listing/_lib/constants.ts`: replaced `FALLBACK_MATERIALS`
  with `export const buildMaterials = (t: TFunction): MaterialOption[] => [...]`
  reading four new keys.
- `src/components/listing/_hooks/useListingForm.ts`: `effectiveMaterials =
  materialList.length > 0 ? materialList : buildMaterials(t)` (the hook already
  owns `const { t } = useTranslation()`).
- Keys added under `product.*` (same namespace as `product.condition*`):
  `materialDiecast`, `materialResin`, `materialComposite`, `materialPlastic`.
  TR keeps the bilingual "English (Turkish)" convention already used for these
  four material names elsewhere; EN drops the redundant parenthetical except
  for `materialDiecast`, which stays "Diecast (Metal)" in both languages — it's
  the one term that reads as ambiguous without the material name spelled out,
  same treatment as `checkout.suratKargo`.
- `src/i18n/__tests__/catalog-integrity.test.ts`: added
  `product.materialDiecast` to the `INTENTIONALLY_IDENTICAL` allowlist (tr/en
  values are the same string on purpose).

**Keys reused:** 0 (none of the four material labels existed anywhere in the
6800-key catalog — searched for "material", "diecast", "resin", "composite",
"plastic", "reçine", "kompozit" first).
**Keys added:** 4 (`product.materialDiecast/Resin/Composite/Plastic`).
**Wording changes:** none to existing strings — these four are net-new keys,
previously hardcoded literals with no i18n path at all.

## Judgement calls

### 1. `ReputationBadge.tsx` (12 Turkish strings, zero callers) — leave as is

Verified zero callers myself: `grep -rn "ReputationBadge\|ReputationLevel\|SpecialRecognition" app` returns nothing; the only references are the export from `src/components/index.ts` and the file's own internal self-reference (`<ReputationBadge level={level} size="small" />` inside its own breakdown sub-component). No screen imports it.

This file already carries a header from an earlier slice (dated 2026-08-29,
same day) stating exactly this: it has zero callers, its `label` fields were
converted to `build*Config(t)` factories (the parity-preserving part), but its
`description`/`criteria` fields — where all 12 remaining Turkish strings live —
were deliberately left untranslated because **they are never rendered**. I
verified this claim rather than trusting it: `grep -n
"description\|criteria\|\.label\b\|\.icon\b\|\.color\b"` on the file shows only
`config.label`, `config.icon`, `config.color` reaching JSX (lines 107-113,
196-201); `description`/`criteria` are defined on the config objects but never
read anywhere in the render tree.

**Decision: leave it.** Translating 12 strings (with ICU args for the numeric
thresholds like "10-50 successful trades, 4.5+ rating") on fields that
provably never render, in a component with zero callers, spends real effort
(new keys, factory conversion, ICU formatting) for zero user-visible benefit —
the same reasoning this repo already applied to `status-configs.ts` and
`format.ts` (both explicitly out of scope for this task). I did not silently
skip it: the existing file header already documents the reasoning and I
re-verified it holds.

### 2. `src/theme/catalog.ts` `CONDITIONS` (4 strings) — same call, documented

Not in the task's given list, but the rerun of the measurement script
surfaced it, so per the instructions I investigated rather than ignoring it.
`grep -rn "theme/catalog"` and `grep -rn "CONDITIONS"` across `app/` and `src/`
show zero importers of the `CONDITIONS` export — only `SCALES` and `BRANDS`
from the same file are actually consumed (by `CategoryFilters.tsx` and
`HomeSections.tsx`), and neither of those has Turkish literals. A comment in
`useModelDetail.ts` and the factory in `src/utils/productFilters.ts`
(`buildConditionOptions(t)`, using `product.condition*` — the very keys this
task's material fix now mirrors) confirm the condition-label story already
moved to a working `t()`-based path elsewhere; `CONDITIONS` here is a leftover
superseded array.

**Decision: leave it, same reasoning as `ReputationBadge.tsx`** — dead export,
zero consumers, duplicates already-translated functionality. Added a short
code comment above the export recording this (no behavior change) so the next
reader doesn't have to re-derive it.

## Gates

- `npx tsc --noEmit` — clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` — 0 errors, 1104 warnings (at/under the ~1106 baseline).
- `npx jest` — 210/210 suites, 1675/1675 tests green (one transient failure
  from CPU contention on a parallel run, `editPrefillContract.test.tsx`,
  reproduced green in isolation and in two subsequent full clean runs).

## Commits

1. `i18n: convert listing FALLBACK_MATERIALS to buildMaterials(t) factory` —
   the real fix (constants.ts, useListingForm.ts, tr.json, en.json,
   generated/keys.ts, theme/catalog.ts comment).
2. `test(i18n): allow product.materialDiecast as intentionally identical` —
   catalog-integrity test allowlist entry.
