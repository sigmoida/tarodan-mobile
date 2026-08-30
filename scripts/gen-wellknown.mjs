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
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/wellknown');
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
  fs.readFileSync(path.join(OUT_DIR, 'fingerprints.json'), 'utf8'),
);
// SHA-256 sertifika parmak izi: 32 bayt, iki hane BUYUK harf hex, ':' ile
// ayrilmis. Sekli dogrulamak sart — "TODO" ya da kucuk harfli bir deger
// yazilirsa dosya yine uretilir ve Android dogrulamayi KESIN olarak dusurur;
// tam da bos-liste bekcisinin engellemek icin var oldugu sonuc.
const SHA256_FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const fingerprints = [];
const badFingerprints = [];
for (const [key, entry] of Object.entries(fingerprintsFile)) {
  const value = (entry?.sha256 ?? '').trim();
  if (value.length === 0) continue;
  if (SHA256_FINGERPRINT.test(value)) fingerprints.push(value);
  else badFingerprints.push(`${key}: "${value}"`);
}
if (badFingerprints.length > 0) {
  console.error(
    'HATA: parmak izi bicimi gecersiz (beklenen: 32 x BUYUK-harf hex, ":" ile ayrilmis, ' +
      'or. AB:CD:...:EF):\n  ' +
      badFingerprints.join('\n  '),
  );
  process.exit(1);
}

const assetLinksPath = path.join(OUT_DIR, 'assetlinks.json');
if (fingerprints.length === 0) {
  // Bos sha256_cert_fingerprints yayinlanirsa Android dogrulamasi "basarisiz"
  // olarak KESINLESIR — hic dosya olmamasindan kotudur.
  if (fs.existsSync(assetLinksPath)) fs.rmSync(assetLinksPath);
  const message =
    'assetlinks.json YAZILMADI — hic parmak izi yok. ' +
    'docs/wellknown/fingerprints.json doldurulmali (eas credentials -p android).';
  if (strict) {
    console.error(`HATA: ${message}`);
    process.exit(1);
  }
  console.warn(`UYARI: ${message}`);
} else {
  const statements = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  fs.writeFileSync(assetLinksPath, `${JSON.stringify(statements, null, 2)}\n`);
  console.log(
    `yazildi: ${path.relative(ROOT, assetLinksPath)} (${fingerprints.length} parmak izi)`,
  );
}

const pending = config.paths.filter((p) => !p.confirmed);
if (pending.length > 0) {
  console.warn(
    `UYARI: ${pending.length} yol TEYIT bekliyor, yayina konmadi: ` +
      pending.map((p) => p.pattern).join(', '),
  );
}
