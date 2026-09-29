/**
 * Sunucu bazı hatalarda ücretli kademeye çağırıyor ("Üyeliğinizi yükseltin",
 * "üyeliğinizi yenileyin"); mobil bu metni çoğu yerde olduğu gibi gösteriyor.
 * iOS'ta kademe satın alınamaz (Apple 3.1.1/3.1.3) — metin nötrleştirilir.
 */
import { neutralizeUpsellError } from '../iosNeutralErrors';

const t = (k: string) => `T(${k})`;
const err = (data: Record<string, unknown>) => ({ response: { status: 403, data: { ...data } } });

describe('neutralizeUpsellError', () => {
  it('bilinen kademe anahtarını nötr mesaja çevirir', () => {
    const e = err({ message: 'Takas özelliği için Premium üyelik gereklidir. Üyeliğinizi yükseltin.', i18nKey: 'server.product.tradeRequiresPremium' });
    neutralizeUpsellError(e, t, false);
    expect(e.response.data.message).toBe('T(membership.featureUnavailableOnAccount)');
  });

  it('ilan limiti anahtarı nötr limit mesajına çevrilir', () => {
    const e = err({ message: 'İlan limitinize ulaştınız. … Üyeliğinizi yükseltin', i18nKey: 'server.product.listingLimitReached' });
    neutralizeUpsellError(e, t, false);
    expect(e.response.data.message).toBe('T(upgradePrompt.listingLimitTitle)');
  });

  it('anahtarsız düz metinli yükseltme çağrısını da yakalar', () => {
    const e = err({ message: 'Koleksiyon özelliği üyeliğinizde mevcut değil. Üyeliğinizi yükseltin.' });
    neutralizeUpsellError(e, t, false);
    expect(e.response.data.message).toBe('T(membership.featureUnavailableOnAccount)');
  });

  it('İngilizce "upgrade your membership" metnini de yakalar', () => {
    const e = err({ message: 'Trade feature requires Premium membership. Upgrade your membership.' });
    neutralizeUpsellError(e, t, false);
    expect(e.response.data.message).toBe('T(membership.featureUnavailableOnAccount)');
  });

  it('ilgisiz hatalara dokunmaz ("sayfayı yenileyin" bir yükseltme çağrısı değil)', () => {
    const e = err({ message: 'Ürün başka bir işlem tarafından güncellendi. Lütfen yenileyin.', i18nKey: 'server.product.updateConflict' });
    neutralizeUpsellError(e, t, false);
    expect(e.response.data.message).toBe('Ürün başka bir işlem tarafından güncellendi. Lütfen yenileyin.');
  });

  it('satın almanın mümkün olduğu platformda dokunmaz', () => {
    const e = err({ message: 'Üyeliğinizi yükseltin.', i18nKey: 'server.product.tradeRequiresPremium' });
    neutralizeUpsellError(e, t, true);
    expect(e.response.data.message).toBe('Üyeliğinizi yükseltin.');
  });
});
