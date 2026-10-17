# Tarodan Mobile

The native iOS and Android app of [Tarodan](https://tarodan.com.tr), a marketplace
for scale models and collectibles. Built with Expo SDK 54 (React Native 0.81),
expo-router, TanStack Query, zustand and a vendored `@/ui` design system that
mirrors the web app at phone width.

The API, web and admin apps live in the separate `tarodan-app` repository.
Cross-repo process, contracts, parity and release decisions live in the private
`tarodan-ops` hub. Engineering rules for this repo: [CLAUDE.md](CLAUDE.md) and the
folder `CLAUDE.md` files it links.

> This repository is public. Never commit secrets, real environment values or
> customer data.

## Setup

Requirements: Node 20+, pnpm 10 (`corepack enable`), Xcode (iOS) and/or Android
Studio (Android), and an Expo account for EAS builds.

```bash
pnpm install --frozen-lockfile
pnpm exec husky            # activate the git hooks (once per clone or worktree)
cp .env.example .env.local # then fill in local values (EXPO_PUBLIC_* only)
```

The git hooks run commitlint (Conventional Commits, English ASCII header), lint-staged
(eslint --fix + prettier on staged files) and a branch-name check on push. Rules:
`tarodan-ops/docs/commit-and-branch-rules.md`.

## Running

The app uses a development build (`expo-dev-client`), not Expo Go.

```bash
pnpm ios                    # build + install the dev client on the iOS simulator
pnpm android                # same for an Android emulator/device
npx expo start --port 8081  # Metro only, for an installed dev client
```

- Point the app at an API with `EXPO_PUBLIC_API_URL` (staging:
  `https://staging.tarodan.com.tr/api`; local simulator: `http://localhost:3001/api`;
  Android emulator: `http://10.0.2.2:3001/api`).
- Don't start Metro with `CI=1`: it disables the file watcher and reloads serve stale
  code.
- Typed routes (`.expo/types`) are regenerated when Metro starts.
- Deep links on the simulator: `xcrun simctl openurl booted "tarodan://<route>"`.

## Testing

```bash
npx tsc --noEmit                    # typecheck
pnpm lint                           # eslint (0 errors; design rules are warnings)
pnpm test --maxWorkers=2 <paths>    # jest + React Native Testing Library
pnpm maestro:dev <flow>             # Maestro E2E flow on the simulator
```

Unit and component tests are colocated in `__tests__/` folders. Maestro flows and
their prerequisites are described in [maestro/README.md](maestro/README.md). CI
(`.github/workflows/ci.yml`) runs lint, typecheck and the full jest suite.

## Release (summary)

Full process: [docs/RELEASE.md](docs/RELEASE.md) and
[docs/EAS_UPDATE_OTA.md](docs/EAS_UPDATE_OTA.md).

- `runtimeVersion` uses the Expo **fingerprint** policy. A JS-only change ships as an
  over-the-air update (OTA); a change to native inputs (native modules, config
  plugins, native `app.json` fields, `eas.json`, `package.json` scripts,
  `.gitignore`, `expo.version`) needs a new store build. Native changes go in their
  own `build(native)` commit.
- Push to `development` -> staging: CI, then an automatic OTA or EAS build per
  platform (TestFlight / Play internal testing).
- `development` -> `master` PR = a release: always a store build, blocked by the
  VERSION-GATE unless `expo.version` was bumped. App Store review is submitted by
  hand.
- Production OTAs ship only from a `hotfix/*` merge into `master`, after approval in
  the `production` GitHub Environment.
- Pipeline logic lives in `scripts/ci/release.sh`; see
  [scripts/ci/CLAUDE.md](scripts/ci/CLAUDE.md).

## Repository layout

```
app/          expo-router routes (thin screens + colocated _hooks/_lib/_modals)
src/ui        @/ui primitives, loading system, sheets, feedback, forms
src/theme     design tokens (synced from tarodan-app packages/design-tokens)
src/lib       api (axios by domain), query (React Query), deeplinks, media, ...
src/stores    zustand client/UI state
src/components feature composites (ProductCard, shells, ...)
src/i18n      tr + en message catalog
maestro/      Maestro E2E flows
scripts/      codegen (i18n keys, well-known files) and CI helpers
docs/         release, OTA, deep links, parity notes
```
