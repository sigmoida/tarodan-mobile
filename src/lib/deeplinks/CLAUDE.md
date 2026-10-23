# src/lib/deeplinks — deep-link path table

Universal Links (iOS) and App Links (Android). Full hand-over doc:
`docs/deep-links.md`.

## Single source

- `paths.json` is the **only** source for the web URL patterns the app claims, the
  hosts (`hosts`, `stagingHosts`), the iOS `appIDs` and the Android packages
  (`androidPackage`, `stagingAndroidPackage`). It feeds:
  - the AASA and `assetlinks*.json` files (generated, see below),
  - `app.config.js` (`associatedDomains`, Android intent filters, staging package),
  - the in-app resolver (`index.ts`: `pathFromUrl`, `normalizePath`,
    `stripLocalePrefix`, `isNeverNavigatePath`, `buildAndroidPathEntries`, ...).
- Patterns are **web** URLs (`/listings/:id`), never mobile route names. Each entry
  has a real `sample`, `include` (claim it or leave it in the browser), `confirmed`
  (exists on web; unconfirmed entries are never published), optional `neverNavigate`
  (no navigation from any scheme, e.g. PayTR 3DS returns) and a `comment`.
  Excluding a path is a decision too: it stays in the table.
- **Listing segments.** A listing URL is `/listings/<slug>-<uuid>` (ADR 0017): the uuid is
  the key, the slug is decoration. `/listings/*` (AASA) and `pathPrefix /listings/`
  (Android) already cover every shape, so the table needs no entry per shape. The mapper
  (`toMobileRoute`) and the `product/[id]`, `product/[id]/reviews` and `listing/[id]/edit`
  screens take the id with `listingIdFromParam` (`@/lib/product/listingParam`, over the
  vendored `parseListingParam`); a segment with no uuid maps to nothing (not-found).
- **`paths.json` is a runtime fingerprint input** (`app.config.js` requires it): any edit,
  even a `sample` or a `comment`, changes the runtime version, so it goes in a
  `build(native)` commit and needs a store build. A stale `sample` is overridden in
  `__tests__/fixtures/routeSamples.ts` until the next native change (the `/listings/*`
  sample `/listings/123` is one today).
- Locales follow next-intl `as-needed`: `defaultLocale` (`tr`) is unprefixed and is
  not claimed with a prefix.
- `index.ts` is pure (no network, no fs). There is deliberately **no** AASA/assetlinks
  generator in it: a second generator would drift.

## Generated files

- `scripts/gen-wellknown.mjs` writes `docs/wellknown/apple-app-site-association`,
  `assetlinks.json` (production package, production hosts) and
  `assetlinks.staging.json` (staging package, staging hosts). **Never edit them by
  hand** (a Claude Code PreToolUse hook blocks it); edit `paths.json` or
  `docs/wellknown/fingerprints.json` (the input SHA-256 list) and regenerate.
- `pnpm wellknown:gen` (warns without fingerprints), `pnpm wellknown:gen:strict`
  (release gate: fails without production fingerprints), `pnpm wellknown:check`
  (`scripts/check-deeplinks.mjs`: measures the live files, CDN and verifier).
- If `wellknown:gen:strict` leaves a diff in `git status`, someone edited
  `paths.json` without regenerating; commit the generated files.

## Order rule

Web files published -> Apple `Associated Domains` capability on -> only then
`associatedDomains` in the app config and a new build. Doing the last step first
caches a verification failure on devices. Adding hosts or entitlements is a native
change (`build(native)` commit).

## Tests

`src/lib/deeplinks/__tests__/`: `paths.test.ts` (property tests on the generated
files), `routes.test.ts` (every `sample` resolves to a mobile route),
`assetlinks.test.ts`, `appConfig.test.ts` (staging/production host split).
