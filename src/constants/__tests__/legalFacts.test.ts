/**
 * Hukuki künye gerçek tüzel kişiyi gösterir.
 *
 * Mesafeli satış sözleşmesi ve gizlilik metni var olmayan bir şirket adı, yanlış
 * şehir ve MX kaydı olmayan bir alan adındaki e-posta kutularını yayınlıyordu.
 * Tüzel kişi bilgisi ana repoda tek kaynakta yazılı
 * (`apps/web/src/lib/legal/platform-entity.ts`) ve bu dosya onun kopyasıdır.
 *
 * Test alanların DOLU ve tutarlı olduğunu çiviliyor; doğruluk ancak tek kaynakla
 * karşılaştırarak korunur, o yüzden değerler elle DEĞİŞTİRİLMEZ.
 */
import { LEGAL_ENTITY, SUPPORT_EMAIL } from '../legalFacts';

describe('hukuki künye', () => {
  it('artık uydurma şirket adını taşımıyor', () => {
    expect(LEGAL_ENTITY.legalName).not.toMatch(/Tarodan Teknoloji A\.Ş\./);
  });

  it('e-posta kutuları doğru alan adında', () => {
    // `@tarodan.com` MX taşımıyor; gerçek alan adı `@tarodan.com.tr`.
    expect(SUPPORT_EMAIL).toMatch(/@tarodan\.com\.tr$/);
  });

  it('her künye alanı dolu — boş bir hukuki metin yayınlanmaz', () => {
    for (const [key, value] of Object.entries(LEGAL_ENTITY)) {
      expect(`${key}: ${String(value)}`.length).toBeGreaterThan(key.length + 2);
    }
  });

  it('ekranlar künyeyi bu sabitten okur, kendi metnini yazmaz', () => {
    /**
     * Eskiden burada ELLE tutulan bir dosya listesi vardı ve tam da beklenen
     * şekilde bayatladı: `intellectual-property.tsx` listede olmadığı için
     * "Tarodan Teknoloji A.Ş."yi yayınlamaya devam etti ve ancak elle test
     * sırasında görüldü. Artık liste yok — `app/` ağacının TAMAMI ve her iki
     * katalog taranıyor, yani yeni eklenen bir belge sessizce kaçamaz.
     */
    const { readdirSync, readFileSync, statSync } = require('fs');
    const { join, resolve } = require('path');
    const root = resolve(__dirname, '../../..');

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name: string) => {
        const full = join(dir, name);
        if (name === 'node_modules' || name.startsWith('.')) return [];
        if (statSync(full).isDirectory()) return walk(full);
        return /\.tsx?$/.test(name) && !full.includes('__tests__') ? [full] : [];
      });

    const sources = [
      ...walk(join(root, 'app')),
      join(root, 'src/i18n/lib/catalog/tr.json'),
      join(root, 'src/i18n/lib/catalog/en.json'),
    ];

    const offenders: string[] = [];
    for (const file of sources) {
      const source = readFileSync(file, 'utf8');
      // Uydurma künye; gerçeği `LEGAL_ENTITY.legalName`.
      if (/Tarodan Teknoloji A\.Ş\./.test(source)) offenders.push(`${file} → uydurma şirket adı`);
      // `@tarodan.com` MX taşımıyor; gerçek alan adı `@tarodan.com.tr`.
      if (/@tarodan\.com[^.]/.test(source)) offenders.push(`${file} → yanlış e-posta alan adı`);
    }

    expect(offenders.map((o) => o.replace(root + '/', ''))).toEqual([]);
  });
});
