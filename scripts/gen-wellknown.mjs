#!/usr/bin/env node
/**
 * paths.json → docs/wellknown/{apple-app-site-association, assetlinks.json}
 *
 * Uretim mantiginin TEK yeri burasi. src/lib/deeplinks/index.ts'te AASA/
 * assetlinks ureteci BILEREK yok — ikinci bir kopya iki tarafi ayri bakima
 * mahkum eder ve sessizce ayrisir. Uretilen dosyanin dogrulugu paths.test.ts'te
 * OZELLIK testleriyle olculur (her teyitli desen dosyada var, teyitsiz hicbiri
 * yok, dislamalar basta) — ikinci bir ureteçle karsilastirilarak degil.
 *
 * Kullanim:
 *   pnpm wellknown:gen         # parmak izi yoksa UYARI + cikis 0 (gunluk kullanim)
 *   pnpm wellknown:gen:strict  # parmak izi yoksa HATA + cikis 1 (SURUM KAPISI)
 *
 * --strict, parmak izi girildikten sonraki surum kapisidir: assetlinks.json
 * uretilemiyorsa build ilerlemesin. Bkz. docs/deep-links.md §4/§6.
 *
 * Iki uygulamali Android modeli (docs/ANDROID_RELEASE.md): production
 * (`androidPackage`) ve staging (`stagingAndroidPackage`) AYRI paketlerdir ve
 * farkli alan adlarini dinler, bu yuzden iki ayri dosya uretilir:
 *   assetlinks.json          → production host(lar)i, YALNIZ production paketi
 *   assetlinks.staging.json  → staging host(lar)i, YALNIZ staging paketi
 * fingerprints.json girdileri `package` alani ile paketine baglanir (alan yoksa
 * production). --strict yalniz production dosyasini sart kosar: staging
 * parmak izleri Play'e ilk staging yuklemesinden sonra bilinebilir.
 *
 * Test icin: --out-dir <dizin> (varsayilan docs/wellknown) ve
 * --fingerprints <dosya> (varsayilan <out-dir>/fingerprints.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const OUT_DIR = path.resolve(argValue('--out-dir') ?? path.join(ROOT, 'docs/wellknown'));
const strict = process.argv.includes('--strict');

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/lib/deeplinks/paths.json'), 'utf8'),
);

// next-intl `as-needed`: varsayilan dil ON EKSIZ render ediliyor, yani
// `/tr/listings/123` kanonik bir URL degil ve yayinda talep edilmiyor.
// Kural src/lib/deeplinks/index.ts#publishedLocalePrefixes ile ayni.
const withLocaleVariants = (pattern) => [
  pattern,
  ...config.locales
    .filter((l) => l !== config.defaultLocale)
    .map((l) => `/${l}${pattern}`),
];

const shipped = config.paths.filter((p) => p.confirmed);
// AASA v2: ilk eslesen component kazanir → dislamalar basa.
const ordered = [
  ...shipped.filter((p) => !p.include),
  ...shipped.filter((p) => p.include),
];
const components = ordered.flatMap((p) =>
  withLocaleVariants(p.pattern).map((pattern) =>
    p.include
      ? { '/': pattern, comment: p.comment }
      : { '/': pattern, exclude: true, comment: p.comment },
  ),
);
const aasa = {
  applinks: { details: [{ appIDs: config.appIDs, components }] },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const aasaPath = path.join(OUT_DIR, 'apple-app-site-association');
fs.writeFileSync(aasaPath, `${JSON.stringify(aasa, null, 2)}\n`);
console.log(`yazildi: ${path.relative(ROOT, aasaPath)} (${components.length} component)`);

const fingerprintsFile = JSON.parse(
  fs.readFileSync(argValue('--fingerprints') ?? path.join(OUT_DIR, 'fingerprints.json'), 'utf8'),
);
// SHA-256 sertifika parmak izi: 32 bayt, iki hane BUYUK harf hex, ':' ile
// ayrilmis. Sekli dogrulamak sart — "TODO" ya da kucuk harfli bir deger
// yazilirsa dosya yine uretilir ve Android dogrulamayi KESIN olarak dusurur;
// tam da bos-liste bekcisinin engellemek icin var oldugu sonuc.
const SHA256_FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const knownPackages = [config.androidPackage, config.stagingAndroidPackage];
// paket adi → parmak izleri
const fingerprintsByPackage = new Map(knownPackages.map((p) => [p, []]));
const badFingerprints = [];
for (const [key, entry] of Object.entries(fingerprintsFile)) {
  if (key.startsWith('_')) continue; // _format gibi aciklama alanlari
  const pkg = entry?.package ?? config.androidPackage;
  const value = (entry?.sha256 ?? '').trim();
  if (!fingerprintsByPackage.has(pkg)) {
    badFingerprints.push(`${key}: bilinmeyen paket "${pkg}" (beklenen: ${knownPackages.join(' | ')})`);
    continue;
  }
  if (value.length === 0) continue;
  if (SHA256_FINGERPRINT.test(value)) fingerprintsByPackage.get(pkg).push(value);
  else badFingerprints.push(`${key}: "${value}"`);
}
if (badFingerprints.length > 0) {
  console.error(
    'HATA: parmak izi girdisi gecersiz (beklenen: 32 x BUYUK-harf hex, ":" ile ayrilmis, ' +
      'or. AB:CD:...:EF; `package` alani varsa bilinen bir paket olmali):\n  ' +
      badFingerprints.join('\n  '),
  );
  process.exit(1);
}

/** Tek paket icin assetlinks icerigi; ayni parmak izi iki kez yazilmaz. */
const buildAssetLinks = (packageName, fingerprints) => [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: [...new Set(fingerprints)],
    },
  },
];

const targets = [
  { file: 'assetlinks.json', packageName: config.androidPackage, gate: true },
  { file: 'assetlinks.staging.json', packageName: config.stagingAndroidPackage, gate: false },
];
let gateFailed = false;
for (const { file, packageName, gate } of targets) {
  const out = path.join(OUT_DIR, file);
  const fingerprints = fingerprintsByPackage.get(packageName);
  if (fingerprints.length === 0) {
    // Bos sha256_cert_fingerprints yayinlanirsa Android dogrulamasi "basarisiz"
    // olarak KESINLESIR — hic dosya olmamasindan kotudur.
    if (fs.existsSync(out)) fs.rmSync(out);
    const message =
      `${file} YAZILMADI — ${packageName} icin hic parmak izi yok. ` +
      'docs/wellknown/fingerprints.json doldurulmali (eas credentials -p android / Play Console → App integrity).';
    if (strict && gate) {
      console.error(`HATA: ${message}`);
      gateFailed = true;
    } else {
      console.warn(`UYARI: ${message}`);
    }
    continue;
  }
  fs.writeFileSync(out, `${JSON.stringify(buildAssetLinks(packageName, fingerprints), null, 2)}\n`);
  console.log(`yazildi: ${path.relative(ROOT, out)} (${packageName}, ${fingerprints.length} parmak izi)`);
}
if (gateFailed) process.exit(1);

const pending = config.paths.filter((p) => !p.confirmed);
if (pending.length > 0) {
  console.warn(
    `UYARI: ${pending.length} yol TEYIT bekliyor, yayina konmadi: ` +
      pending.map((p) => p.pattern).join(', '),
  );
}
