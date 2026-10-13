# EAS Update (OTA) — Tarodan Mobile

Over-the-air (OTA) updates are the fast "continuous staging" analogue for the
mobile app: a JS/asset-only change reaches installed builds in ~1 minute without
a store round-trip. This is the mobile mirror of the backend's continuous
`development → Coolify staging` deploy (issue #230, part of #227).

## The one rule

> **JS / asset change → OTA update.** **Native change → full EAS Build.**

A "native change" is anything that alters the compiled binary:

- adding/removing a native module (a new `expo-*` package, any RN native lib),
- an Expo SDK bump,
- a `config plugin` change or anything under `ios/` · `android/`,
- editing `app.json` fields baked into the binary (permissions, `plugins`,
  `bundleIdentifier`/`package`, icons/splash).

Everything else — React components, hooks, TS logic, images/fonts bundled with
JS — ships as an OTA update.

## How it's wired

`app.json`:

```jsonc
"runtimeVersion": { "policy": "fingerprint" },   // OTA only reaches builds with the same native fingerprint
"updates": { "url": "https://u.expo.dev/a1d4149d-bbbc-49a8-9a26-d2b81cd842d3" }
```

`eas.json` build profiles → update channels:

| Build profile | `channel`    | Feeds                                                   |
| ------------- | ------------ | ------------------------------------------------------- |
| `staging`     | `staging`    | Tarodan (Staging): TestFlight + Play internal testing   |
| `preview`     | `staging`    | ad-hoc Android APK (EAS internal distribution)          |
| `production`  | `production` | App Store / Play (internal track)                       |
| `development` | (none)       | dev-client loads from local Metro                       |

**`runtimeVersion: fingerprint`** ties every OTA to a hash of the build's native
inputs (resolved app config incl. `expo.version`, `eas.json`, config plugins,
autolinked native modules). An update is delivered _only_ to binaries with the
same fingerprint — it can never land on an incompatible native build. CI uses
the same hash to decide OTA vs. build: see [`RELEASE.md`](./RELEASE.md).

## Publishing an update

```bash
# Prefer CI. By hand, release.sh loads the profile env from eas.json for you:
scripts/ci/release.sh publish-ota staging all preview "fix: cart total rounding"
scripts/ci/release.sh publish-ota production ios production "fix: cart total rounding"
```

The `staging` / `production` channels point at the same-named branches (set once
with `eas channel:edit staging --branch staging` if not auto-linked). Testers
pull the update on the next app launch.

CI automates both: `mobile-staging.yml` publishes to `staging` on every
`development` push whose fingerprint matches an existing staging build, and
`mobile-production.yml` publishes to `production` (behind the `production`
environment approval) on `master` merges. The workflows load the profile's
`EXPO_PUBLIC_*` env from `eas.json` (`scripts/ci/release.sh`), because
`eas update` does not read build-profile env on its own — do the same when
publishing by hand (e.g. `EXPO_PUBLIC_ENVIRONMENT=preview` plus the rest of the
`preview` env for staging), otherwise the fingerprint won't match any build.

## Activation (one-time, operator)

OTA is guarded behind EAS credentials, so nothing runs until these are done
(see `SECRETS_SETUP.md`):

1. `expo-updates` is already a dependency (`~29.0.19`, Expo SDK 54 pin). A fresh
   `pnpm install` materializes it; it is embedded by the next **native** EAS
   build (it cannot be delivered over OTA to a build that lacks it).
2. Set `EXPO_TOKEN` as an **environment** secret (`staging`, `production-build`,
   `production` — not a repo secret) so CI can run `eas update`; see
   [`RELEASE.md`](./RELEASE.md).
3. First native build per profile establishes the runtime that later OTA updates
   attach to.
