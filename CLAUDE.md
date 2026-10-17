# tarodan-mobile

The native Tarodan marketplace client: Expo SDK 54, expo-router, TanStack Query,
zustand. Cross-repo rules (process, freeze, agents, contracts, parity) live in the
private hub **tarodan-ops** (`CLAUDE.md` and `docs/`). This file summarises what
applies here and must stand alone for the essentials. Engineering detail lives in
the folder `CLAUDE.md` files mapped under "Architecture"; their stable headings are
the reference targets (`see src/ui/CLAUDE.md › Loading`).

## Language

- All new content is English: code, comments, commits, branches, docs, CLAUDE.md,
  skills, agents. Replies to the user are in **Turkish**.
- Existing Turkish comments may stay until you edit them; translate what you edit.

## Product principles

- **Web at phone width (< 640 px) is the visual and behavioural reference.** Sizes,
  colour roles, copy, ordering and states come from the web app (`tarodan-app/apps/web`).
- Native-only deviations are platform idioms: bottom tab bar, native stack + back
  arrow, bottom sheets, infinite scroll, pull-to-refresh, safe areas.
- **Web parity by default.** Mobile differs only when an App Store / Play rule forces
  it; every such deviation has an ADR in tarodan-ops `decisions/` (e.g. digital sales
  off on mobile). A deviation from web found in review is an IMPORTANT finding.
- This repo is the native mirror of tarodan-app `apps/web/CLAUDE.md`: a rule here that
  isn't native-specific means "same as web".

## Principles

- SOLID, DRY, KISS, YAGNI. **One source of truth** for every rule, value, type,
  status map, label, query key and copy. About to copy a block? Extract it
  (component, hook or constant). Duplicated config (status maps, filter tabs,
  labels) is the most dangerous kind: it drifts silently.
- Follow official current Expo / React Native / expo-router practice. Non-route code
  lives in `src/`; small route-local helpers may live in `_` folders under `app/`.
- One design system with web: tokens come from tarodan-app `packages/design-tokens`
  (mobile `src/theme` is a synced copy); `@/ui` mirrors `@tarodan/ui` naming and
  variants. No ad-hoc colours, sizes or variants; add missing pieces to the shared
  layer first.
- **Fix what you touch.** Violations in the area you change are fixed in the same
  change; anything bigger goes to the tarodan-ops `backlog.md`.
- Definition of Done: tarodan-ops `docs/definition-of-done.md` (every change, UI,
  feature, money/payment, mobile native change).

## Architecture

| Layer | Where | Rule file |
| --- | --- | --- |
| Routes (thin screens, `_hooks`, `_lib`, `_modals`) | `app/` | `app/CLAUDE.md` |
| Primitives, loading, sheets, feedback, forms | `src/ui` (`@/ui`, vendored `@tarodan/ui-native`) | `src/ui/CLAUDE.md` |
| Design tokens (synced copy) and role tokens | `src/theme` (`theme` via `@/ui`) | `src/theme/CLAUDE.md` |
| Axios surface by domain | `src/lib/api` (`@/lib/api`) | `src/lib/api/CLAUDE.md` |
| Server state, query keys, mutations | `src/lib/query` (`@/lib/query`) | `src/lib/query/CLAUDE.md` |
| Client/UI state only | `src/stores` | `src/stores/CLAUDE.md` |
| Feature composites (`ProductCard`, shells, ...) | `src/components/<feature>` | `src/components/CLAUDE.md` |
| Message catalog (tr + en) | `src/i18n` | `src/i18n/CLAUDE.md` |
| Deep-link path table, well-known files | `src/lib/deeplinks` | `src/lib/deeplinks/CLAUDE.md` |
| Release pipeline helpers | `scripts/ci` | `scripts/ci/CLAUDE.md` |
| E2E flows | `maestro/` | `maestro/README.md` |

- Cross-route hooks go in `src/hooks/`; everything else is colocated with its route
  or feature. `@tarodan/*` packages are vendored under `src/`; there are no external
  workspace packages.
- **Imports use the `@/` alias** (`@/lib/api`, `@/lib/query`, `@/components/...`),
  never `../../../src/...`. Metro resolves tsconfig `paths`; jest maps `@/` in
  `jest.config.js`.
- Web -> mobile mapping: `@tarodan/ui` -> `@/ui`; `@tarodan/ui/form` -> `@/ui/form`;
  App Router groups + `_folders` -> expo-router groups + `_folders`; TanStack Query +
  `lib/api/*` -> the same; Tailwind token classes -> `theme` from `@/ui`. Server
  Components / `generateMetadata` have no native equivalent.

## Commits and branches

Full rules: tarodan-ops `docs/commit-and-branch-rules.md`. Enforced locally by
husky + commitlint + lint-staged (run `pnpm exec husky` once per clone/worktree).

- Conventional Commits, English, **ASCII header**, at most 72 characters.
  Types: `feat fix refactor perf docs test chore build ci`. Subject imperative,
  lower case, no period. The body explains the why.
- Scopes: `app ui nav checkout auth push i18n theme ci native deps release`
  (several: `fix(ui,nav): ...`).
- No `Co-Authored-By` trailer, no "Generated with" footer. Never `git add -A`
  blindly. Never `--no-verify`, never `git stash`, never force-push.
- **Anything that changes the runtime fingerprint goes in its own `build(native)`
  commit**: native modules, native `app.json`/`app.config.js` fields, config plugins,
  permissions, privacy manifest, `eas.json`, `package.json` scripts, `.gitignore`.
- Branches `<type>/<kebab-description>` (`feat fix refactor perf chore ci docs test
  hotfix`); checked on pre-push. Merges are `--no-ff`; no squash.
- **No push without the user's explicit approval.** Agents commit on their own branch
  and stop there.

## Verification

Run from the repo root, one at a time (16 GB machines, parallel agents):

- `npx tsc --noEmit`: 0 errors. Typed routes (`.expo/types`) regenerate when Metro
  starts; never edit them.
- `pnpm lint`: 0 errors and no new warnings. Design-discipline rules
  (`eslint-plugin-tarodan`) are warnings today and become errors; write new code
  warning-free.
- `pnpm test --maxWorkers=2 <paths>`: only the tests for what you touched; the full
  suite runs in CI or once at the end.
- Exercise the changed flow in the app (Metro, simulator); behaviour unchanged.

## Release

Details: `docs/RELEASE.md`, `docs/EAS_UPDATE_OTA.md`, `scripts/ci/CLAUDE.md`.

- `runtimeVersion.policy` is `fingerprint`: a JS-only change ships as an **OTA**; a
  fingerprint change needs a **store build**. `expo.version` is part of the
  fingerprint.
- `development` push -> staging (automatic OTA or build). `development -> master`
  PR = a release = always a store build, gated by **VERSION-GATE** (the version must
  be bumped). A production OTA ships **only from a `hotfix/*` merge**, with approval.
- Deploy order across repos: web -> API -> mobile; a mobile fix that the new API
  needs ships as an OTA before the API deploy.
- **The production freeze is active** (tarodan-ops ADR 0010): no master merge, no
  production OTA, build or submit until the user lifts it.

## Contracts and parity

- Read the relevant contract deltas (tarodan-ops `contracts/deltas/`, older ones in
  `docs/mobile-parity/`) before using or changing an endpoint. `src/types` is a
  vendored copy of tarodan-app `packages/types`.
- When mobile implements a delta, add a contract fixture test and mark the delta.
- Parity status lives in tarodan-ops `parity/matrix.md`; a one-sided feature needs an
  ADR.

## Security

- **This repo is PUBLIC.** Never commit secrets, tokens, real env values, customer
  data, signing material (`.p8`, `.p12`, keystores, service-account JSON) or
  production dumps. Secrets live in EAS and GitHub Environments.
- Logs and Sentry events carry ids, never PII (no tokens, TCKN, IBAN, card data,
  addresses or phone numbers). Mobile reports only 5xx and network errors.
- Policy: tarodan-ops `docs/security-policy.md`, `docs/observability.md`.
