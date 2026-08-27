/**
 * Premium tespiti sunucunun GERÇEKTEN gönderdiği alandan yapılır.
 *
 * Ekran `limits.maxListings === -1` arıyordu. Sunucu `maxListings` diye bir alan
 * döndürmüyor; `useMembershipLimits` `maxTotalListings`'i (200) o ada
 * bindiriyor, yani karşılaştırma `200 === -1` → sonsuza kadar false. Sonuç:
 * PREMIUM ÜYELER premium analitiği hiç görmüyordu. Staging'de ölçüldü:
 * `/membership/me/limits` → `{"maxTotalListings":200,"tierType":"premium"}`.
 *
 * Bu sınıfın adı var: "istemci, yanıtta olmayan bir alanı okuyor". Sözleşme
 * bekçisi (Task 1-3, denetim dalı) yalnız ters yönü tarıyor, bu yüzden bu kusur
 * elle bulundu.
 */
import { isPremiumTier } from '../analytics/_lib/premium';

describe('isPremiumTier', () => {
  it('sunucunun tierType alanından premium okur', () => {
    expect(isPremiumTier({ tierType: 'premium' })).toBe(true);
  });

  it('business da premium yeteneklerini taşır', () => {
    expect(isPremiumTier({ tierType: 'business' })).toBe(true);
  });

  it.each(['free', 'basic'])('%s premium değildir', (tierType) => {
    expect(isPremiumTier({ tierType })).toBe(false);
  });

  it('limits hiç gelmediğinde premium VARSAYMAZ', () => {
    // İlk render'da sorgu çözülmemiş olabilir. Premium varsaymak, ödemeyen
    // kullanıcıya bir an premium bölüm göstermek olurdu.
    expect(isPremiumTier(undefined)).toBe(false);
    expect(isPremiumTier(null)).toBe(false);
  });

  it('`maxListings === -1` deseni bir daha kullanılmaz', () => {
    // Regresyon: sunucu böyle bir alan göndermiyor; yerel taban tablosundaki
    // -1 bindirmeyle her zaman geziliyor. Kuralı kaynakta çiviliyoruz.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../analytics/_hooks/useAnalytics.ts'),
      'utf8',
    );
    expect(source).not.toContain('maxListings === -1');
  });
});
