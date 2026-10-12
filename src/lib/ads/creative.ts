/**
 * Reklamın "görselli mi / çizilebilir mi" kararı — TEK predicate (useAds filtresi,
 * AdBanner çizimi ve hotspot kuralı aynı tanımı kullanır; yalnız boşluk içeren
 * `imageUrl` görsel reklam sayılmaz).
 */
type AdLike = { imageUrl?: string | null; title?: string | null };

/** Görselli reklam: `imageUrl` boşluk dışında içerik taşıyor. */
export const hasAdImage = (ad: Pick<AdLike, 'imageUrl'>): boolean => !!ad.imageUrl?.trim();

/** Çizilebilir reklam: görselli ya da (metin reklam) başlıklı. */
export const hasAdCreative = (ad: AdLike): boolean => hasAdImage(ad) || !!ad.title?.trim();
