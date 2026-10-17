// Dynamic Expo config — extends app.json with per-variant overrides.
//
// The static base config lives in app.json (single source of truth). Expo loads
// it first and passes it here as `config`; we only diverge the fields that MUST
// differ per build profile so that a STAGING build can sit next to the
// PRODUCTION build on the same device (issue #229).
//
// The variant is derived from EXPO_PUBLIC_ENVIRONMENT, which every eas.json build
// profile already sets (development | preview | production). Only `preview`
// (= our internal staging distribution) gets the `.staging` id + the short home-screen name "Staging"
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

// Yalnız iOS bundle id eki; Android staging paketi paths.json'dan gelir.
const STAGING_SUFFIX = '.staging';

// Staging Android'in Firebase yapılandırması. Gradle google-services eklentisi,
// dosyada derlenen paketin istemcisi yoksa build'i durdurur; production dosyası
// (`./google-services.json`, yalnız com.tarodan.app) staging paketine UYMAZ, bu
// yüzden staging ASLA ona sessizce düşmez. Öncelik sırası:
//   1. repo kökünde ./google-services.staging.json (VARSAYILAN, repoda duruyor)
//   2. GOOGLE_SERVICES_JSON_STAGING — EAS "file" tipi ortam değişkeni; YALNIZ
//      repo dosyası yoksa devreye giren yedek (bkz. aşağıdaki fingerprint notu)
//   3. ikisi de yoksa: Android build bağlamında AÇIK HATA (aşağıya bak).
//
// Neden repo dosyası önde: expo-updates fingerprint'i Android'de dosyanın
// İÇERİĞİNİ hash'ler (yolu değil). EAS build'i ile `eas update` (OTA) job'u
// AYNI içeriği görmezse runtime fingerprint'i eşleşmez ve staging OTA'ları
// Android staging cihazlarına hiç ulaşmaz. OTA job'unda EAS file değişkeni
// yoktur, repo dosyası her zaman vardır; env değişkeni önce gelseydi bayat bir
// değişken build'in hash'ini sessizce ayırırdı. Repo dosyası önde olunca iki
// yol da aynı dosyayı okur. Dosyayı değiştirirsen EAS'teki değişkeni de aynı
// içerikle güncelle (yedek olarak kalıyor).
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
  if (args.includes('run:android')) return true;
  if (args.includes('prebuild')) {
    // `expo prebuild` platform verilmezse "all" (= Android dahil) çalışır.
    const platforms = parsePlatformArg(args);
    return platforms === null || platforms.includes('android') || platforms.includes('all');
  }
  return false;
}

/**
 * `--platform <v>`, `--platform=<v>`, `-p <v>`, `-p=<v>`, `-p<v>` değerlerini
 * ayrıştırır; virgüllü liste desteklenir. Bayrak yoksa ya da değeri yoksa
 * (`--platform` sonda ya da yanında başka bir bayrak var) `null` döner, yani
 * "belirtilmedi". Bütün argüman satırına regex atmak yanlış: `--no-install`
 * içindeki "all" harfleri Android sanılırdı.
 */
function parsePlatformArg(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let value;
    if (arg === '--platform' || arg === '-p') {
      const next = args[i + 1];
      value = next !== undefined && !next.startsWith('-') ? next : undefined;
    } else if (arg.startsWith('--platform=')) {
      value = arg.slice('--platform='.length);
    } else if (arg.startsWith('-p=')) {
      value = arg.slice('-p='.length);
    } else if (/^-p[^-=]/.test(arg)) {
      value = arg.slice(2);
    } else {
      continue;
    }
    const platforms = (value ?? '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    return platforms.length > 0 ? platforms : null;
  }
  return null;
}

/**
 * Staging için `android.googleServicesFile` değerini seçer. Android native
 * bağlamında dosya okunabiliyorsa içinde derlenen paketin istemcisi olduğunu da
 * doğrular (yanlış dosyayı — örn. production'ınkini — Gradle'dan önce,
 * anlaşılır bir mesajla yakalar). Diğer bağlamlarda doğrulama yapılmaz.
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
  if (exists(path.join(root, STAGING_GOOGLE_SERVICES_LOCAL))) file = STAGING_GOOGLE_SERVICES_LOCAL;
  else if (fromEnv) file = fromEnv;

  if (!file) {
    if (isAndroidNativeContext(env, argv)) {
      throw new Error(
        `[app.config] Staging Android build'i için google-services.json bulunamadı. ` +
          `repo kökünde ${STAGING_GOOGLE_SERVICES_LOCAL} (ya da yedek olarak ` +
          `${STAGING_GOOGLE_SERVICES_ENV} EAS "file" tipi ortam değişkeni) gerekli; ikisi de yok. Production dosyası ` +
          `(./google-services.json) "${packageName}" paketini içermez, bu yüzden ona düşülmez. ` +
          `Firebase'e "${packageName}" Android uygulamasını ekleyip dosyayı indirin: docs/ANDROID_RELEASE.md`,
      );
    }
    // iOS build / OTA / yerel `expo config`: Android dosyası kullanılmaz. Var
    // olmayan yol bilerek bırakılır; Android'e geçilirse dosya-yok hatası verir.
    return STAGING_GOOGLE_SERVICES_LOCAL;
  }

  const resolved = path.isAbsolute(file) ? file : path.join(root, file);
  // Paket doğrulaması da YALNIZ Android native bağlamında: iOS build'i, `eas update`
  // ve `expo start` aynı config'i değerlendirir ama Android dosyasına dokunmaz;
  // dosyadaki bir eksik onları kırmamalı.
  if (packageName && isAndroidNativeContext(env, argv) && exists(resolved)) {
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

// Staging alan adı(ları) ve Android paket adı: src/lib/deeplinks/paths.json tek
// kaynak (`stagingHosts`, `stagingAndroidPackage`; burada ikinci bir tanım YOK).
// app.json'daki production config staging host'unu İÇERMEZ (Play/App Store
// incelemesinde görünmesin); yalnız staging profilinde devreye girer.
const { stagingHosts, stagingAndroidPackage } = require('./src/lib/deeplinks/paths.json');

/**
 * Android intent filter'larında `host` değerlerini staging host'larıyla DEĞİŞTİRİR.
 * Yalnız `host` alanına dokunulur: `scheme`, `path*` vb. taşıyan `data` nesneleri
 * silinmez ve sırası korunur. Girdi değiştirilmez.
 *
 *  - Yalnız `{ host }` taşıyan nesne: ilk görülen yerde staging host'larının
 *    hepsiyle (`{ host: h }` × N) değişir; sonraki saf host nesneleri (ör. ikinci
 *    production host'u) düşer, yoksa staging host'u tekrar eder.
 *  - `host` ile birlikte başka alan taşıyan nesne (`{ scheme, host }`,
 *    `{ host, path }`): her staging host'u için bir kopya üretilir, diğer alanlar aynen kalır.
 *  - `stagingHosts` boşsa host taşıyan filtre TAMAMEN düşer: host'suz bir
 *    `autoVerify` filtresi bırakmak her https linkini talep eden/doğrulaması
 *    düşen bir filtredir.
 *
 * Neden eklemek değil değiştirmek: staging artık AYRI bir pakettir ve
 * production yanında kurulabilir. Production alan adını (`tarodan.com.tr`)
 * ikisi de dinlerse, o alan adına gelen her link cihazda "hangi uygulama?"
 * seçicisi çıkarır; ayrıca assetlinks.json'da production host'u yalnız
 * production paketini yetkilendirir, staging paketinin o host'taki doğrulaması
 * zaten düşerdi.
 */
function withStagingHosts(intentFilters = [], hosts = stagingHosts) {
  const isHostOnly = (d) => Object.keys(d).length === 1 && d.host;
  return intentFilters.flatMap((filter) => {
    const data = filter.data ?? [];
    if (!data.some((d) => d.host)) return [filter];
    if (hosts.length === 0) return [];
    let hostOnlyDone = false;
    const nextData = data.flatMap((d) => {
      if (!d.host) return [d];
      if (isHostOnly(d)) {
        if (hostOnlyDone) return [];
        hostOnlyDone = true;
        return hosts.map((host) => ({ host }));
      }
      return hosts.map((host) => ({ ...d, host }));
    });
    return [{ ...filter, data: nextData }];
  });
}

// Env vars whose value the Sentry Xcode scripts append to the sentry-cli call.
const SENTRY_CLI_ARGS_ENV = [
  'SENTRY_CLI_EXTRA_ARGS',
  'SENTRY_CLI_RN_XCODE_EXTRA_ARGS',
  'SENTRY_CLI_DEBUG_FILES_UPLOAD_EXTRA_ARGS',
];

/**
 * Fails an EAS build early when it would ship without readable crash reports.
 *
 * With `SENTRY_DISABLE_AUTO_UPLOAD` unset (the `production` profile), the Sentry
 * Xcode phase and Gradle task upload source maps and dSYMs with
 * `SENTRY_AUTH_TOKEN`. Without the token they would fail only at the end of a
 * long native build; here the build stops while the config is read, with a
 * message that names the fix. A production build also needs
 * `EXPO_PUBLIC_SENTRY_DSN`: without it `src/services/sentry.ts` is a no-op and
 * the store binary reports nothing at all. A production build that uploads also
 * stops when sentry-cli runs in allow-failure mode, because it would then
 * swallow a failed upload and the binary would ship without symbols unnoticed.
 *
 * Staging and development profiles keep `SENTRY_DISABLE_AUTO_UPLOAD=true` and
 * pass. Only EAS build workers are checked (`EAS_BUILD`): eas-cli on the CI
 * runner, `eas update`, `expo start` and the CI fingerprint and app-id checks
 * read the same config without the secret and must not break. A deliberate production build
 * without symbols stays possible by setting `SENTRY_DISABLE_AUTO_UPLOAD=true` in
 * the EAS environment; it is logged as a warning, never silent.
 * Setup: docs/RELEASE.md, "Sentry source maps and debug symbols".
 *
 * `env` and `warn` are parameters for tests only.
 */
function assertSentryBuildReady(env = process.env, warn = console.warn) {
  const flag = (name) => !['', '0', 'false'].includes((env[name] ?? '').trim().toLowerCase());
  if (!flag('EAS_BUILD')) return;
  const isProduction = env.EXPO_PUBLIC_ENVIRONMENT === 'production';
  // Exact match, untrimmed: sentry-xcode.sh and sentry.gradle compare the raw
  // value to "true", so " true" would pass here and still upload (and fail) later.
  const uploadDisabled = env.SENTRY_DISABLE_AUTO_UPLOAD === 'true';
  const profile = env.EAS_BUILD_PROFILE || 'unknown';
  const fail = (problem, fix) => {
    throw new Error(
      `[app.config] EAS build profile "${profile}" ${problem} ` +
        `${fix}, or set SENTRY_DISABLE_AUTO_UPLOAD=true there to skip the upload on purpose. ` +
        'See docs/RELEASE.md, "Sentry source maps and debug symbols".',
    );
  };
  const missing = [];
  if (!uploadDisabled && !(env.SENTRY_AUTH_TOKEN ?? '').trim()) missing.push('SENTRY_AUTH_TOKEN');
  if (isProduction && !(env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim()) missing.push('EXPO_PUBLIC_SENTRY_DSN');
  if (missing.length > 0) {
    fail(
      `is missing ${missing.join(' and ')}. ` +
        'Without them the store binary ships with unreadable (or no) Sentry crash reports.',
      "Create the EAS environment variable(s) for this profile's environment",
    );
  }
  // A failed source map upload fails the Xcode phase and the Gradle task, unless
  // sentry-cli runs in allow-failure mode: it then exits 0 and the store binary
  // ships without symbols, silently. sentry-cli 2.x turns that mode on for
  // SENTRY_ALLOW_FAILURE of exactly "true" or "1" (checked against the vendored
  // binary) and for an `--allow-failure` argument, which the Xcode scripts take
  // from these env vars. The deliberate opt-out above is the only way to skip.
  // Not covered here: the iOS dSYM phase (sentry-xcode-debug-files.sh) exits 0
  // on a failed upload in any mode; see docs/RELEASE.md.
  if (isProduction && !uploadDisabled) {
    const allowFailure = [];
    if (['true', '1'].includes(env.SENTRY_ALLOW_FAILURE)) {
      allowFailure.push(`SENTRY_ALLOW_FAILURE=${env.SENTRY_ALLOW_FAILURE}`);
    }
    for (const name of SENTRY_CLI_ARGS_ENV) {
      if ((env[name] ?? '').split(/\s+/).includes('--allow-failure')) {
        allowFailure.push(`--allow-failure in ${name}`);
      }
    }
    if (allowFailure.length > 0) {
      fail(
        `sets ${allowFailure.join(' and ')}: a failed Sentry upload would pass silently ` +
          'and the store binary would ship with unreadable crash reports.',
        "Remove it from this profile's environment",
      );
    }
  }
  if (isProduction && uploadDisabled) {
    warn(
      '[app.config] SENTRY_DISABLE_AUTO_UPLOAD=true on a production EAS build: ' +
        'source maps and dSYMs are NOT uploaded, so Sentry stack traces of this build stay unreadable.',
    );
  }
}

module.exports = ({ config }) => {
  assertSentryBuildReady();
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
    // Ana ekranda kısa ad ("Tarodan (Staging)" iPhone'da "Tarodan(St…" diye kesiliyordu).
    name: 'Staging',
    ios: {
      ...stagingIos,
      bundleIdentifier: `${config.ios.bundleIdentifier}${STAGING_SUFFIX}`,
    },
    // Android: iOS ile aynı model — staging paketi ayrı bir uygulama
    // (`com.tarodan.app.staging`) ve yalnız staging alan adındaki App Links'i
    // yakalar. Paket adı paths.json `stagingAndroidPackage`'dan okunur (tek kaynak).
    android: {
      ...config.android,
      package: stagingAndroidPackage,
      googleServicesFile: resolveStagingGoogleServicesFile({ packageName: stagingAndroidPackage }),
      intentFilters: withStagingHosts(config.android?.intentFilters),
    },
  };
};

module.exports.resolveStagingGoogleServicesFile = resolveStagingGoogleServicesFile;
module.exports.isAndroidNativeContext = isAndroidNativeContext;
module.exports.withStagingHosts = withStagingHosts;
module.exports.assertSentryBuildReady = assertSentryBuildReady;
