/**
 * iOS'ta sunucunun ücretli kademeye çağıran hata metinlerini nötrleştirir.
 *
 * Sunucu bazı hatalarda kullanıcıyı üyelik yükseltmeye/yenilemeye çağırıyor
 * ("Üyeliğinizi yükseltin", "Temel veya üstü üyeliğinizi yenileyin"); ekranlar
 * `response.data.message`'ı çoğu yerde olduğu gibi gösteriyor. iOS'ta kademe
 * satın alınamaz (Apple 3.1.1/3.1.3 — uygulama dışı satın almaya yönlendirme),
 * bu yüzden metin hata ekrana ulaşmadan TEK yerde (axios response interceptor)
 * nötr bir mesajla değiştirilir.
 *
 * İki yol: (1) bilinen katalog anahtarları (`i18nKey`, 2026-09-29 master
 * `packages/i18n` taraması), (2) anahtarsız düz metin — `membership.service`
 * `reason`'ları doğrudan Türkçe dönüyor.
 */
type T = (key: string) => string;

const NEUTRAL = 'membership.featureUnavailableOnAccount';

/** Sunucu anahtarı → nötr mobil anahtar. */
const UPSELL_KEYS: Record<string, string> = {
  'server.product.listingLimitReached': 'upgradePrompt.listingLimitTitle',
  'server.product.tradeRequiresPremium': NEUTRAL,
  'server.product.corporateSalesSuspended': NEUTRAL,
  'server.trade.membershipRequiredForCounter': NEUTRAL,
  'server.trade.membershipExpiredForAccept': NEUTRAL,
  'server.user.businessFeatureOnly': NEUTRAL,
  'server.membership.premiumFeatureOnly': NEUTRAL,
};

/** Anahtarsız metinler: yalnız ÜYELİK yükseltme/yenileme çağrısı ("sayfayı yenileyin" değil). */
// `u` bayrağı şart: onsuz /i büyük "Ü"yü küçük "ü" ile eşlemiyor.
const UPSELL_TEXT =
  /üyeli[ğg]\S*\s+(yükselt|yenile)|üyeli[ğg]e\s+geç|(upgrade|renew)\s+your\s+membership/iu;

export function neutralizeUpsellError(error: unknown, t: T, canBuyDigital: boolean): void {
  if (canBuyDigital) return;
  const data = (error as { response?: { data?: { message?: unknown; i18nKey?: unknown } } })?.response?.data;
  if (!data || typeof data !== 'object') return;

  const key = typeof data.i18nKey === 'string' ? UPSELL_KEYS[data.i18nKey] : undefined;
  if (key) {
    data.message = t(key);
    return;
  }
  if (typeof data.message === 'string' && UPSELL_TEXT.test(data.message)) {
    data.message = t(NEUTRAL);
  }
}
