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
//   1. Firebase / FCM — staging paketi AYRI Firebase projesinde (tarodan-staging;
//      production tarodan-c1290) ve ayrı google-services.json (aşağıda `resolveStagingGoogleServicesFile`).
//      Paket adı dosyada yoksa Gradle "No matching client found" ile düşer.
//   2. Google Cloud OAuth — her paket için ayrı Android istemcisi (paket +
//      SHA-1). Eksikse build düşmez, "Google ile giriş" sessizce çalışmaz;
//      bu yüzden EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED bayrağı o işe kadar "false".
// Adım adım: docs/ANDROID_RELEASE.md

const fs = require('fs');
const path = require('path');

const STAGING_SUFFIX = '.staging';

// Staging Android'in Firebase yapılandırması. Gradle google-services eklentisi,
// dosyada derlenen paketin istemcisi yoksa build'i durdurur; production dosyası
// (`./google-services.json`, yalnız com.tarodan.app) staging paketine UYMAZ, bu
// yüzden staging ASLA ona sessizce düşmez. Öncelik sırası:
//   1. GOOGLE_SERVICES_JSON_STAGING — EAS "file" tipi ortam değişkeni (önerilen:
//      dosya repoya girmez; `eas env:create --type file`, bkz. docs/ANDROID_RELEASE.md)
//   2. repo kökünde ./google-services.staging.json
//   3. ikisi de yoksa: Android build bağlamında AÇIK HATA (aşağıya bak).
const STAGING_GOOGLE_SERVICES_ENV = 'GOOGLE_SERVICES_JSON_STAGING';
const STAGING_GOOGLE_SERVICES_LOCAL = './google-services.staging.json';

/**
 * Bu işlem Android native projesini mi üretiyor/derliyor? Yalnız bu durumda
 * eksik google-services.json hata sayılır: iOS build'i ve `eas update` (OTA)
 * aynı config'i değerlendirir ama Android dosyasına hiç dokunmaz; onları
 * kırmamalı. `eas build` makinesinde EAS_BUILD_PLATFORM kesin ayarlıdır.
 */
function isAndroidNativeContext(env, argv) {
  if (env.EAS_BUILD_PLATFORM === 'android') return true;
  const args = argv.slice(2);
  return (
    args.includes('run:android') ||
    (args.includes('prebuild') && /android|all/.test(args.join(' ')))
  );
}

/**
 * Staging için `android.googleServicesFile` değerini seçer. Dosya okunabiliyorsa
 * içinde derlenen paketin istemcisi olduğunu da doğrular (yanlış dosyayı —
 * örn. production'ınkini — Gradle'dan önce, anlaşılır bir mesajla yakalar).
 *
 * `opts` yalnız test içindir.
 */
function resolveStagingGoogleServicesFile(opts = {}) {
  const {
    env = process.env,
    argv = process.argv,
    root = __dirname,
    exists = fs.existsSync,
    read = (p) => fs.readFileSync(p, 'utf8'),
    packageName,
  } = opts;

  const fromEnv = (env[STAGING_GOOGLE_SERVICES_ENV] ?? '').trim();
  let file = null;
  if (fromEnv) file = fromEnv;
  else if (exists(path.join(root, STAGING_GOOGLE_SERVICES_LOCAL))) file = STAGING_GOOGLE_SERVICES_LOCAL;

  if (!file) {
    if (isAndroidNativeContext(env, argv)) {
      throw new Error(
        `[app.config] Staging Android build'i için google-services.json bulunamadı. ` +
          `${STAGING_GOOGLE_SERVICES_ENV} (EAS "file" tipi ortam değişkeni) ya da repo kökünde ` +
          `${STAGING_GOOGLE_SERVICES_LOCAL} gerekli; ikisi de yok. Production dosyası ` +
          `(./google-services.json) "${packageName}" paketini içermez, bu yüzden ona düşülmez. ` +
          `Firebase'e "${packageName}" Android uygulamasını ekleyip dosyayı indirin: docs/ANDROID_RELEASE.md`,
      );
    }
    // iOS build / OTA / yerel `expo config`: Android dosyası kullanılmaz. Var
    // olmayan yol bilerek bırakılır; Android'e geçilirse dosya-yok hatası verir.
    return STAGING_GOOGLE_SERVICES_LOCAL;
  }

  const resolved = path.isAbsolute(file) ? file : path.join(root, file);
  if (packageName && exists(resolved)) {
    let packages = null;
    try {
      packages = (JSON.parse(read(resolved)).client ?? []).map(
        (c) => c?.client_info?.android_client_info?.package_name,
      );
    } catch {
      packages = null; // okunamadı/ayrıştırılamadı: Gradle kendi hatasını verir
    }
    if (packages && !packages.includes(packageName)) {
      throw new Error(
        `[app.config] ${file} "${packageName}" paketinin istemcisini içermiyor ` +
          `(bulunanlar: ${packages.filter(Boolean).join(', ') || 'hiçbiri'}). ` +
          `Staging için Firebase'de "${packageName}" Android uygulamasının dosyasını indirin.`,
      );
    }
  }
  return file;
}

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
  const stagingAndroidPackage = `${config.android.package}${STAGING_SUFFIX}`;

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
      package: stagingAndroidPackage,
      googleServicesFile: resolveStagingGoogleServicesFile({ packageName: stagingAndroidPackage }),
      intentFilters: withStagingHosts(config.android?.intentFilters),
    },
  };
};

module.exports.resolveStagingGoogleServicesFile = resolveStagingGoogleServicesFile;
