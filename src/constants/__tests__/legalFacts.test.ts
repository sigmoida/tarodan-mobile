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
    // Tüzel kişi künyesi geçen her yayınlanmış hukuki metin burada olmalı —
    // yoksa yeni eklenen bir belge sessizce eski/uydurma künyeyle kalır.
    for (const file of [
      'app/distance-sales.tsx',
      'app/privacy.tsx',
      'app/seller-agreement.tsx',
    ]) {
      const source = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../..', file),
        'utf8',
      );
      expect(source).not.toMatch(/Tarodan Teknoloji A\.Ş\./);
      expect(source).not.toMatch(/@tarodan\.com[^.]/);
    }
  });
});
