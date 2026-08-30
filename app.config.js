// Dynamic Expo config — extends app.json with per-variant overrides.
//
// The static base config lives in app.json (single source of truth). Expo loads
// it first and passes it here as `config`; we only diverge the fields that MUST
// differ per build profile so that a STAGING build can sit next to the
// PRODUCTION build on the same device (issue #229).
//
// The variant is derived from EXPO_PUBLIC_ENVIRONMENT, which every eas.json build
// profile already sets (development | preview | production). Only `preview`
// (= our internal staging distribution) gets the `.staging` id + "(Staging)"
// label; `production` and `development` are returned untouched.
//
// ⚠️  iOS ONLY — Android deliberately keeps `com.tarodan.app`.
// Suffixing the Android package would need TWO registrations, not one:
//   1. Firebase / FCM — expo-notifications' Android push needs google-services.json
//      to list the package, or Gradle fails with "No matching client found".
//   2. Google Cloud OAuth client — @react-native-google-signin needs an Android
//      client registered with the package name + keystore SHA-1. Missing this does
//      NOT fail the build; the APK installs and "Sign in with Google" dies silently.
// The payoff (staging next to production on one device) is currently worthless on
// Android: com.tarodan.app has never been published — no Play release, no installs,
// nothing to sit next to. Revisit when Android production actually ships; both
// registrations must be done that day.
// Rationale in full: docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md §2

const STAGING_SUFFIX = '.staging';

module.exports = ({ config }) => {
  const isStaging = process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview';
  if (!isStaging) {
    return config;
  }

  // `associatedDomains` staging'e GİRMEZ. İki sebep, ikisi de bundle id
  // sonekinden çıkıyor:
  //   1. Yayındaki AASA yalnız `P2628CQK26.com.tarodan.app`'i talep ediyor;
  //      `.staging` orada olmadığı için iOS doğrulamayı zaten geçemez. Yani
  //      entitlement'ı taşımanın bir faydası yok.
  //   2. Staging App ID'sinin provisioning profile'ında Associated Domains
  //      yeteneği açık değil ve entitlement istendiği anda imzalama düşüyor
  //      ("doesn't support the Associated Domains capability" — 2026-08-26).
  // Staging'de de universal link isteniyorsa iki iş birlikte yapılmalı:
  // AASA'ya `.staging` appID'si eklenmeli VE portal'da yetenek açılmalı.
  const { associatedDomains: _productionOnly, ...stagingIos } = config.ios;

  return {
    ...config,
    name: `${config.name} (Staging)`,
    ios: {
      ...stagingIos,
      bundleIdentifier: `${config.ios.bundleIdentifier}${STAGING_SUFFIX}`,
    },
  };
};
