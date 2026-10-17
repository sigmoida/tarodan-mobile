---
name: add-i18n-key
description: Add or change user-facing copy in tarodan-mobile - reuse the web key and text, add it to both tr.json and en.json, regenerate keys.ts with node scripts/gen-keys.mjs and run the i18n tests. Use whenever a screen needs a new string.
argument-hint: "[key, e.g. offers.counterSent]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(node scripts/gen-keys.mjs) Bash(pnpm test *)
---

# Add an i18n key

Key: `$ARGUMENTS`. Rules: `src/i18n/CLAUDE.md`.

## 1. Look for it on web first

The web catalog is tarodan-app `packages/i18n/src/catalog/{tr,en}.json`. Search it
(and the mobile catalog) for the text or a matching key:

```bash
node -e 'const c=require("../tarodan-app/packages/i18n/src/catalog/tr.json");const f=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"?f(v,p+k+"."):[[p+k,v]]);for(const [k,v] of f(c)) if(/SEARCH/i.test(v)||/SEARCH/i.test(k)) console.log(k,"=",v)'
```

(Replace `SEARCH`; adjust the path if tarodan-app is checked out elsewhere.)

- Found on web: use the **same key and the same tr/en text**.
- Not on web: use the web's naming style; mobile-only strings go under `mobile.*`,
  shared storefront strings under the bare domain (`offers.*`, `checkout.*`).
- Never rewrite an existing value as a side effect.

## 2. Add to both catalogs

Edit `src/i18n/lib/catalog/tr.json` **and** `src/i18n/lib/catalog/en.json` at the same
dot-path. ICU arguments like web: `{count}`, `{n, plural, one {...} other {...}}`.
Proper names stay untranslated; copy near a purchase stays store-neutral.

## 3. Regenerate the key union

```bash
node scripts/gen-keys.mjs
```

In Claude Code a PostToolUse hook runs this after every catalog edit; run it anyway
if you edited the catalog another way. Never edit `src/i18n/lib/generated/keys.ts` by
hand (a PreToolUse hook blocks it).

## 4. Use it and test

- `t('domain.key')` with `useTranslation()`; shared label sets are build functions
  taking `t` (never module-level constants).
- Run:

```bash
pnpm test --maxWorkers=2 src/i18n
```

`catalog-integrity` fails on tr/en drift or a stale `keys.ts`; `webParityValues`
pins shared values.

- If the key should also exist on web and doesn't, add a tarodan-ops backlog line (or
  tell the orchestrator) so web gets the same key.
