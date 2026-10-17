# src/i18n — message catalog

The unified ICU catalog shared in shape with web: `lib/catalog/tr.json` and
`lib/catalog/en.json` (web copy: tarodan-app `packages/i18n/src/catalog/`). i18next +
i18next-icu setup in `config.ts`; the typed key union `lib/generated/keys.ts` is
generated, never edited by hand.

## Copy

- **Same i18n key, same value as web.** Look the key up in tarodan-app
  `packages/i18n/src/catalog/{tr,en}.json` first and reuse its name and text.
- Namespaces: `common.*` shared primitives; bare `<domain>.*` storefront UI shared
  with web; `mobile.*` mobile-only strings; `server.*` API messages.
- Don't rewrite existing catalog values as a side effect of a UI change.
- No hardcoded user-facing strings in screens or components (the
  `scripts/scan-untranslated.mjs` scanner finds Turkish literals).

## Adding a key

1. Add the key to **both** `tr.json` and `en.json` (exact key parity; prefer the
   web's key name and text).
2. Regenerate the types: `node scripts/gen-keys.mjs` (`pnpm i18n:codegen`). In Claude
   Code a PostToolUse hook runs it after every catalog edit and reports keys missing
   from tr.json or en.json.
3. Run `pnpm test --maxWorkers=2 src/i18n` (`catalog-integrity` checks tr/en parity
   and that `keys.ts` is fresh; `noRawIcu` checks ICU rendering; `webParityValues`
   pins shared values).

Plurals and arguments are ICU like web (`{count}`, `{n, plural, ...}`); Hermes lacks
`Intl.PluralRules`, so `pluralRules.ts` polyfills it before init.

## Build labels at call time

- Never translate at module scope: a module-level constant freezes the label in the
  language active at import time.
- Shared label sets are **build functions** that take `t`
  (`buildFilters(t)`, `build*Config(t)`) and run at call time; only labels vary by
  language, enum codes and variants stay constant.
- A non-React module (`_lib`, `utils`, stores) cannot resolve its own translator:
  take `t` from a live `useTranslation()` / `schemaT` at the call site.

## Proper names

- Brand and proper names are not translated (e.g. carrier names such as "Sürat
  Kargo", place names, legal entity names).

## Store-neutral copy

- Digital purchases are off on both stores (`CAN_BUY_DIGITAL` in
  `src/lib/purchases.ts`, tarodan-ops ADR 0003). Copy shown where a purchase would be
  must stay neutral: it may name the feature or the limit, never a paid tier, a price
  or a way to buy (App Store 3.1.1 / 3.1.3 anti-steering, Play Payments policy).
- Titles keep their own meaning per prompt type; only the message is neutralised.
