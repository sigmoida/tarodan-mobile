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
- editing `app.json` / `app.config.js` fields baked into the binary
  (permissions / `blockedPermissions`, `plugins`, `associatedDomains`,
  `intentFilters`, `privacyManifests`, `bundleIdentifier`/`package`,
  icons/splash), any edit to `eas.json`, or a file that `app.config.js` reads
  (e.g. `src/lib/deeplinks/paths.json` → Android staging intent filters). All of
  these change the **fingerprint** (see below), so an OTA built from such a tree
  is never delivered to the old binary.

Everything else — React components, hooks, TS logic, images/fonts bundled with
JS — ships as an OTA update.

## How it's wired

`app.json`:

```jsonc
"runtimeVersion": { "policy": "fingerprint" },  // OTA only reaches builds with the same native fingerprint
"updates": { "url": "https://u.expo.dev/a1d4149d-bbbc-49a8-9a26-d2b81cd842d3" }
```

`eas.json` build profiles → update channels:

| Build profile | `channel`    | Feeds                                  |
| ------------- | ------------ | -------------------------------------- |
| `preview`     | `staging`    | internal staging testers (staging-api) |
| `production`  | `production` | TestFlight / Play production           |
| `development` | (none)       | dev-client loads from local Metro      |

**`runtimeVersion: fingerprint`** is a hash over a fixed set of _sources_ (not
over "whatever looks native"). Measured on this repo with
`expo-updates fingerprint:generate` (`@expo/fingerprint` 0.15.5):

| Source in the hash                                              | Note                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The **resolved** Expo config                                    | `app.json` _after_ `app.config.js` and plugins ran; includes `expo.version`     |
| `eas.json` and `.easignore`                                     | the whole file, so **any** edit (even an `env` value) changes the hash          |
| Config-plugin sources, incl. local `plugins/*.js`               | and the plugin packages' `package.json` / build output                          |
| Files the config names (icon, splash)                           | content, not path                                                               |
| Autolinked native modules (iOS / Android)                       | add/remove/upgrade a native lib                                                 |
| `.gitignore`, `package.json` `scripts`                          | `ios/` · `android/` are ignored in the managed workflow (not checked in)        |

So the fingerprint does **not** change only when the resolved Expo config
changes. Pure JS/TS/asset-bundle edits and reformatting `app.json` without
changing its resolved value leave it alone; bumping `expo.version`, editing
`eas.json`, or touching a local config plugin changes it. (An earlier version of
this doc said a version bump alone keeps the runtime — it does not; the next
store build with a new version gets a new fingerprint and the previous
binary stops receiving OTAs built after that bump.) An update is delivered _only_ to
binaries whose fingerprint equals the update's — it can never land on an
incompatible native build. When a native change ships, the fingerprint changes
automatically: cut a new store build (the version bump is still the release tag
for `mobile-testflight.yml`, #228). Old binaries keep receiving OTAs built
against _their_ fingerprint only and, if they fall below the API's
`minSupportedAppVersion`, the force-update gate (#232 / #233) blocks them.

Check before publishing: `npx expo-updates fingerprint:generate` (or
`npx @expo/fingerprint .`) prints the current hash; compare with the build you
target. A mismatch means the change is native and needs a build, not an update.

**The environment you generate it in matters.** `app.config.js` resolves a
different config per `EXPO_PUBLIC_ENVIRONMENT` (staging gets the `.staging` iOS
bundle id, the `(Staging)` name and the staging App Links hosts), so each
environment has its own fingerprint. For the **staging** channel run:

```bash
EXPO_PUBLIC_ENVIRONMENT=preview npx expo-updates fingerprint:generate
```

and compare with the staging build. Without the variable you get the
production fingerprint, which never matches a staging binary. (The same
variable is set by the `preview` / `staging` profiles in `eas.json`; the OTA
workflow exports it too.) Add `--platform ios` or `--platform android` to
check one platform.

## Publishing an update

```bash
cd apps/mobile

# JS-only change already merged to development → push it to the staging channel:
eas update --branch staging --message "fix: cart total rounding"

# Promote to production (after verifying on staging builds):
eas update --branch production --message "fix: cart total rounding"
```

The `staging` / `production` channels point at the same-named branches (set once
with `eas channel:edit staging --branch staging` if not auto-linked). Testers
pull the update on the next app launch.

CI automates the staging publish on every JS-only merge to `development` — see
`mobile-staging.yml` (#231).

## Activation (one-time, operator)

OTA is guarded behind EAS credentials, so nothing runs until these are done
(see `SECRETS_SETUP.md`):

1. `expo-updates` is already a dependency (`~29.0.19`, Expo SDK 54 pin). A fresh
   `pnpm install` materializes it; it is embedded by the next **native** EAS
   build (it cannot be delivered over OTA to a build that lacks it).
2. Set the `EXPO_TOKEN` repo secret so CI (`mobile-staging.yml`, #231) can run
   `eas update`.
3. First native build per profile establishes the runtime that later OTA updates
   attach to.
