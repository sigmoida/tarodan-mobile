#!/usr/bin/env node
/**
 * Heroicons (MIT) SVG yollarını `src/ui/icons/icon-paths.generated.ts` içine gömer.
 *
 * Kullanım:   node scripts/gen-icons.mjs <heroicons-paket-dizini>
 *   (dizin = `npm pack heroicons` çıktısı: içinde `24/outline` ve `24/solid` olan klasör.
 *    Projeye bağımlılık EKLENMEZ; yalnız seçili ikonların path verisi koda kopyalanır.)
 *
 * Eklenecek ikonlar `scripts/icon-names.json` (web `@heroicons/react` kebab adı:
 * `HeartIcon` -> `heart`). Yeni ikon: adı JSON'a ekle, komutu yeniden çalıştır.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('Kullanım: node scripts/gen-icons.mjs <heroicons-paket-dizini>');
  process.exit(1);
}
const names = JSON.parse(readFileSync(join(root, 'scripts/icon-names.json'), 'utf8')).sort();

/** SVG içindeki <path .../> öğelerini [d, evenodd?] olarak çıkarır. */
function parsePaths(svg, file) {
  if (/<(circle|rect|line|polygon|polyline|ellipse|g)\b/.test(svg)) {
    throw new Error(`${file}: path dışı öğe var — Icon yalnız <path> destekler`);
  }
  const out = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
    const attrs = m[1];
    const d = /\bd="([^"]+)"/.exec(attrs)?.[1];
    if (!d) throw new Error(`${file}: d yok`);
    const evenodd = /fill-rule="evenodd"/.test(attrs);
    out.push(evenodd ? [d, 1] : d);
  }
  if (!out.length) throw new Error(`${file}: path yok`);
  return out;
}

let body = '';
for (const name of names) {
  const entry = {};
  for (const variant of ['outline', 'solid']) {
    const file = join(src, '24', variant, `${name}.svg`);
    entry[variant] = parsePaths(readFileSync(file, 'utf8'), file);
  }
  body += `  '${name}': ${JSON.stringify(entry)},\n`;
}

const header = `/**
 * ÜRETİLDİ — elle düzenlemeyin. \`node scripts/gen-icons.mjs <heroicons-dizini>\`
 * Kaynak: Heroicons v2 (MIT, © Tailwind Labs) — lisans: ./HEROICONS_LICENSE
 * Biçim: her ikon \`{ outline, solid }\`; öğe = path \`d\` dizgesi ya da \`[d, 1]\` (fill-rule evenodd).
 */
export type IconPathData = string | readonly [string, 1];
export interface IconDefinition {
  readonly outline: readonly IconPathData[];
  readonly solid: readonly IconPathData[];
}

export const ICON_PATHS = {
`;
writeFileSync(
  join(root, 'src/ui/icons/icon-paths.generated.ts'),
  `${header}${body}} as const satisfies Record<string, IconDefinition>;\n`,
);
console.log(`${names.length} ikon yazıldı.`);
