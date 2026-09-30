# Tarodan Mobile — Release Process

How the mobile app ships, mirroring the backend's staging/production cadence
(issue #234, part of #227). Two tracks:

| Track          | Trigger                                     | Pipeline                | Where it lands                                                    |
| -------------- | ------------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| **Staging**    | push to `main` → auto OTA only; build is manual (`workflow_dispatch`) | `mobile-staging.yml`    | JS→OTA `staging` channel · native→internal preview build          |
| **Production** | push to `master` **with a changed `expo.version`** | `mobile-production.yml` | TestFlight (iOS). Android deferred — see below. |

The golden rule (see [`EAS_UPDATE_OTA.md`](./EAS_UPDATE_OTA.md)):

> **JS / asset change → OTA update. Native change → full EAS Build.**

---

## Staging (continuous)

Every push to `main` runs `mobile-staging.yml`, which decides automatically:

- **JS/asset-only** → `eas update --branch staging`, published for free. Testers
  on a `staging` build (the `preview` profile, channel `staging`) get it on next
  launch (~1 min).
- **Native** (deps, `app.json`/`app.config.js`/`eas.json`, `ios/`·`android/`,
  plugins, `google-services.json`) → publishes nothing and prints a warning
  instead. The runtime version policy is `fingerprint`, so a native change
  moves the fingerprint — an OTA couldn't reach any existing binary anyway.

A build only ever happens through a deliberate `workflow_dispatch` — see
"Sending a staging APK to a customer" below.

Install: staging builds carry the name "Tarodan (Staging)". On **iOS** they also
carry the `com.tarodan.app.staging` bundle id (#229), so a staging build sits next
to production on one device. On **Android** the package stays `com.tarodan.app` —
suffixing it would need a Firebase/FCM registration *and* a Google Cloud OAuth
client (missing the latter breaks "Sign in with Google" silently), and the payoff
is currently nil since Android production has never shipped. Rationale:
[`specs/2026-08-05-staging-apk-dagitimi-design.md`](./superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md) §2.

## Sending a staging APK to a customer

Android testers install straight from EAS internal distribution — no Play Store,
no account setup on their side.

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build
```

`platform` defaults to `android`, so this burns **no iOS build credit**. For a
staging TestFlight release you must say so explicitly:

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build -f platform=ios
gh workflow run mobile-staging.yml --ref main -f mode=build -f platform=all
```

When the run finishes, the job summary carries a **"Staging APK hazır"** block
with the install page URL. Send that link to the customer. On their phone:

1. Open the link in the Android browser
2. The APK downloads
3. Approve "install from unknown sources" when prompted
4. The app installs as **Tarodan (Staging)** and opens like any other app —
   testing happens inside the app, not in the browser

**Updating them afterwards:** JS/asset changes reach the installed APK over the
air (`channel: staging`) — no new APK, no new link. Only a native change
(deps, `app.json`/`app.config.js`/`eas.json`, `ios/`·`android/`, plugins,
`google-services.json`) needs a fresh build.

**Known gap — deep links.** `assetlinks.json` is not published for the staging
domain, so `https://staging.tarodan.com.tr/...` links open in the browser instead
of jumping into the app. The app itself is unaffected, and `tarodan://` links
still work. The one flow this blocks is **email verification / password reset**:
the customer taps the link in their email and lands on the website, so that
journey can't be tested end-to-end inside the app. Closing it needs the keystore's
SHA-256 (`eas credentials -p android`) published in `assetlinks.json` on the web
side — no rebuild required. See
[`deep-links.md`](./deep-links.md) and
[`specs/2026-08-05-staging-apk-dagitimi-design.md`](./superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md) §4.

**Known gap — Google sign-in.** No Android build has ever shipped from this
project, so the release keystore is brand new and its SHA-1 fingerprint is
registered nowhere. The "Sign in with Google" button still renders — Android
doesn't gate it on any configuration check — but tapping it fails at runtime
with `DEVELOPER_ERROR` (code 10), because `@react-native-google-signin` needs
an Android OAuth client in the Google Cloud project matching both the package
name `com.tarodan.app` and the signing keystore's SHA-1. Closing it needs that
OAuth client registered with the SHA-1 from `eas credentials -p android` — the
same command's SHA-256 output is what the deep-links gap above needs, so both
close from one place.

**Server-side requirement — Google sign-in audience.** The client IDs in
`eas.json` are only half of the setup, and the missing half is not on this repo:
the API verifies the incoming `idToken` against an audience list it builds from
`GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_ID_IOS` and `GOOGLE_CLIENT_ID_ANDROID`,
**silently dropping the ones that are undefined**. The names are labels only —
all three land in one list, and nothing branches on platform.

What the app actually sends is the key detail: `configure()` passes
`webClientId` as the native SDK's `serverClientID`, so the `aud` claim of the
token is the **web** client ID (`243308404313-kdc77bd36…`), *not* the iOS one.
Until 2026-09-07 the API only knew `1048836099670-5kdee…` — a web client from a
**different Google Cloud project**, the one the website uses. Website sign-in
therefore worked while mobile did not: `aud` was never in the list.

The symptom is easy to misread. Google's own flow succeeds — the account picker
appears and Google sends its "new sign-in" email — and only then does
`POST /auth/google` return 401, surfacing as "Google ile giriş başarısız …
(kod: `ERR_BAD_REQUEST`)". That code is axios' label for any 4xx, not a Google
error page. The API log line names the real cause:
`Google token verify failed: Wrong recipient, payload audience != requiredAudience`.

Closing it needed no rebuild — the mobile web client ID was added to the API
environment (in the unused `GOOGLE_CLIENT_ID_ANDROID` slot, which is also where
it belongs for Android, whose tokens carry the same `aud`) and the API
redeployed. Note a container's environment is fixed at creation: **redeploy, not
restart**. Three Google Cloud projects are still in play — web `1048836099670`,
mobile `243308404313`, and `google-services.json` `575470440212` — and they
should eventually be consolidated. That is safe to do: account linkage keys off
the Google `sub`, which belongs to the account, not the project.

## Production

Trigger: **a push to `master` in which `app.json`'s `expo.version` changed.**
`mobile-production.yml` compares `expo.version` between `github.event.before` and
`HEAD`; if it is unchanged the whole run skips, so ordinary `master` merges never
burn an EAS build. `workflow_dispatch` bypasses the gate for a deliberate manual
release.

> **There is no `mobile-v*` tag flow and no `mobile-testflight.yml`.** Both
> belonged to the monorepo era and are gone. Tagging a release is fine as a marker
> but triggers nothing.

Steps:

1. **Bump the version on `main`:** set `expo.version` in `app.json` (e.g. `1.0.1`).
   This committed value is the source of truth. Build number auto-increments on
   EAS (`appVersionSource: remote`, `autoIncrement: buildNumber`), so leave
   `ios.buildNumber` alone.
2. **Merge `main` → `master`.** The push triggers `mobile-production.yml`:
   `eas build --platform ios --profile production` → `eas submit --profile
   production --latest` → the build lands in **TestFlight**.
3. **TestFlight is not App Review.** Submitting for review is a separate manual
   step in App Store Connect, after you have tested the build.
4. Promote JS-only fixes for the shipped version with
   `eas update --branch production` — no store round-trip.

**iOS only.** Android is deliberately deferred (spec 2026-07-31 §7): it needs a
Play service account plus a dual-client `google-services.json`. `com.tarodan.app`
has never shipped on Play.

**Guard:** if `EXPO_TOKEN` is missing the workflow no-ops rather than failing.

## Required secrets & credentials (one-time)

The workflows are **guarded no-ops until `EXPO_TOKEN` is set** — safe to keep
committed. To activate:

| Secret / credential                              | Where                                                               | Used by                                  |
| ------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------- |
| **`EXPO_TOKEN`** (GitHub repo secret)            | expo.dev → account → Access Tokens (owner `mki19xcis-organization`) | every EAS workflow (build/submit/update) |
| **App Store Connect API key**                    | uploaded to **EAS** via `eas credentials` (stays on EAS servers)    | `eas submit` iOS                         |
| **Google Play service account JSON**             | uploaded to **EAS** via `eas credentials` (stays on EAS servers)    | `eas submit` Android                     |
| **`EXPO_PUBLIC_API_URL`** (EAS env, per profile) | `eas env:create` — preview→staging-api, production→prod api         | build-time bundling                      |

> Apple **and** Google submit credentials live on EAS servers (like the Apple
> signing certs), so they never touch the repo. That's why `eas.json`
> `submit.production.android` carries only `track` — no committed
> `serviceAccountKeyPath` (the earlier `./google-services.json` value was wrong:
> that file is the Firebase config, not a Play service account).

Step-by-step account setup and the verification checklist:
[`SECRETS_SETUP.md`](../SECRETS_SETUP.md). OTA specifics:
[`EAS_UPDATE_OTA.md`](./EAS_UPDATE_OTA.md).

## Cheat sheet

```
JS/asset fix, fast to staging     → push to main                       (auto OTA)
JS/asset fix, fast to production  → eas update --branch production
New native module / SDK bump      → gh workflow run mobile-staging.yml -f mode=build
APK to a customer for testing     → gh workflow run mobile-staging.yml -f mode=build
Public release                    → bump app.json version → master → tag mobile-vX.Y.Z
```
