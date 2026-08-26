/**
 * Katalog bütünlüğü — i18n göçünün bekçisi.
 *
 * Göç uzun ve mekanik: 711 dosyanın bugün 98'i çeviriyi kullanıyor. Bu kadar
 * uzun süren bir işte asıl risk kalan işin büyüklüğü değil, **ilerlemenin
 * sessizce geri gitmesi**:
 *
 *  - biri TR anahtarı ekler, EN'i unutur → uygulama İngilizce'de Türkçe basar
 *    ve hiçbir şey hata vermez (i18next fallback'e düşer);
 *  - biri `keys.ts`'i elle düzenler → tip ile katalog ayrışır.
 *
 * Bu testler o iki yolu kapatıyor. Kapsamı bilerek dar: metinlerin KENDİSİNİ
 * denetlemiyorlar (çeviri kalitesi bir testin işi değil), yalnız iki kataloğun
 * aynı iskeleti taşıdığını ve üretilen tiplerin taze olduğunu çiviliyorlar.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const tr = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/tr.json`, 'utf8'));
const en = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/en.json`, 'utf8'));

function flatten(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value, path) : [path];
  });
}

const trKeys = flatten(tr);
const enKeys = flatten(en);

describe('katalog anahtar iskeleti', () => {
  it('iki katalog AYNI anahtarları taşır', () => {
    expect([...enKeys].sort()).toEqual([...trKeys].sort());
  });

  it('anahtar SIRASI da aynı — diff okunabilir kalsın', () => {
    // Sıra bozulunca her katalog değişikliği yüzlerce satırlık diff üretiyor ve
    // gerçek değişiklik gözden kayboluyor (bir kez yaşandı: alfabetik sıralama
    // denemesi 359 satırlık sahte diff çıkardı).
    expect(enKeys).toEqual(trKeys);
  });

  it('hiçbir değer boş değil', () => {
    for (const [locale, catalog] of [['tr', tr], ['en', en]] as const) {
      for (const key of flatten(catalog)) {
        const value = key.split('.').reduce((o: any, k) => o[k], catalog);
        expect(typeof value).toBe('string');
        expect(`${locale}:${key} → "${value}"`).not.toMatch(/→ ""$/);
      }
    }
  });
});

describe('üretilen tipler', () => {
  it('`keys.ts` katalogla aynı hizada — elle düzenlenmemiş', () => {
    // `node scripts/gen-keys.mjs` çıktısı dosyadakiyle birebir olmalı. Aksi
    // halde `MessageKey` var olmayan bir anahtarı kabul eder ya da gerçek bir
    // anahtarı reddeder; ikisi de derleme zamanında değil ÇALIŞMA zamanında
    // ortaya çıkar.
    const before = readFileSync(`${ROOT}/src/i18n/lib/generated/keys.ts`, 'utf8');
    execFileSync('node', ['scripts/gen-keys.mjs'], { cwd: ROOT, stdio: 'pipe' });
    const after = readFileSync(`${ROOT}/src/i18n/lib/generated/keys.ts`, 'utf8');
    expect(after).toBe(before);
  });
});

describe('çeviri tamamlanmamış anahtarlar', () => {
  /**
   * İki katalogda birebir aynı olan değerler. Bir kısmı meşru (özel isimler,
   * "OK", "Tarodan", sayı biçimleri) ama çoğu **çevrilmemiş TR metni**.
   *
   * Sayı bir EŞİK olarak tutuluyor: göç ilerledikçe düşmeli, asla artmamalı.
   * Yeni bir TR metnini EN kataloğuna kopyalayıp bırakmak bu testi düşürür.
   */
  const IDENTICAL_VALUE_BUDGET = 50;

  it(`en fazla ${IDENTICAL_VALUE_BUDGET} anahtar iki dilde aynı değeri taşıyor`, () => {
    const identical = trKeys.filter((key) => {
      const pick = (c: any) => key.split('.').reduce((o: any, k) => o[k], c);
      return pick(tr) === pick(en);
    });
    // Aştığında: yeni eklenen anahtarı gerçekten İngilizce'ye çevir, bütçeyi
    // yükseltme. Düştüğünde: bütçeyi indir ki kazanım kilitlensin.
    expect(identical.length).toBeLessThanOrEqual(IDENTICAL_VALUE_BUDGET);
  });
});
