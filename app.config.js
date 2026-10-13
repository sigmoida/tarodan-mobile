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
// Android da iOS ile AYNI iki-uygulama modelini izler: staging paketi
// `com.tarodan.app.staging`, production `com.tarodan.app` (Play'de iki ayrı
// uygulama). Eskiden Android'e ek konmuyordu (Android hiç yayınlanmamıştı);
// yayın kararıyla artık konuyor. Bunun bedeli iki ayrı kayıt, ikisi de
// build'in dışında yapılır:
//   1. Firebase / FCM — staging paketi için ayrı Android uygulaması ve ayrı
//      google-services.json (aşağıda `resolveStagingGoogleServicesFile`).
//      Paket adı dosyada yoksa Gradle "No matching client found" ile düşer.
//   2. Google Cloud OAuth — her paket için ayrı Android istemcisi (paket +
//      SHA-1). Eksikse build düşmez, "Google ile giriş" sessizce çalışmaz;
//      bu yüzden EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED bayrağı o işe kadar "false".
// Adım adım: docs/ANDROID_RELEASE.md

const STAGING_SUFFIX = '.staging';

// Staging alan adı(ları): src/lib/deeplinks/paths.json tek
// kaynak. app.json'daki production config staging host'unu İÇERMEZ (Play/App
// Store incelemesinde görünmesin); yalnız staging profilinde devreye girer.
const { stagingHosts } = require('./src/lib/deeplinks/paths.json');

/**
 * Android intent filter'larında `host` girdilerini staging host'larıyla DEĞİŞTİRİR
 * (ilk `host` girdisinin yerine; yol girdileri ve sırası aynen korunur). Girdi
 * değiştirilmez.
 *
 * Neden eklemek değil değiştirmek: staging artık AYRI bir pakettir ve
 * production yanında kurulabilir. Production alan adını (`tarodan.com.tr`)
 * ikisi de dinlerse, o alan adına gelen her link cihazda "hangi uygulama?"
 * seçicisi çıkarır; ayrıca assetlinks.json'da production host'u yalnız
 * production paketini yetkilendirir, staging paketinin o host'taki doğrulaması
 * zaten düşerdi.
 */
function withStagingHosts(intentFilters = []) {
  return intentFilters.map((filter) => {
    const data = filter.data ?? [];
    const firstHost = data.findIndex((d) => d.host);
    if (firstHost === -1) return filter;
    return {
      ...filter,
      data: [
        ...data.slice(0, firstHost),
        ...stagingHosts.map((host) => ({ host })),
        ...data.slice(firstHost).filter((d) => !d.host),
      ],
    };
  });
}

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
    // Android: iOS ile aynı model — staging paketi ayrı bir uygulama
    // (`com.tarodan.app.staging`) ve yalnız staging alan adındaki App Links'i
    // yakalar. Paket adı `<prod>.staging`; paths.json'daki `stagingAndroidPackage`
    // ile aynı olmak ZORUNDA (appConfig.test.ts kilitler).
    android: {
      ...config.android,
      package: `${config.android.package}${STAGING_SUFFIX}`,
      intentFilters: withStagingHosts(config.android?.intentFilters),
    },
  };
};
