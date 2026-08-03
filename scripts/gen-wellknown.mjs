#!/usr/bin/env node
/**
 * paths.json → docs/wellknown/{apple-app-site-association, assetlinks.json}
 *
 * Yalniz I/O yapar; uretim mantigi src/lib/deeplinks/index.ts ile ayni
 * algoritmadir ve paths.test.ts ikisinin ciktisini karsilastirir.
 *
 * Kullanim:
 *   node scripts/gen-wellknown.mjs           # parmak izi yoksa UYARI + cikis 0
 *   node scripts/gen-wellknown.mjs --strict  # parmak izi yoksa HATA + cikis 1
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

const withLocaleVariants = (pattern) => [
  pattern,
  ...config.locales.map((l) => `/${l}${pattern}`),
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
const fingerprints = Object.values(fingerprintsFile)
  .map((f) => f.sha256)
  .filter((s) => s && s.trim().length > 0);

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
