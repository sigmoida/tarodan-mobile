/**
 * CMS sayfası WebView gezinme kararı. İçerik sunucudan gelen HTML'dir; içindeki
 * bir bağlantı WebView'i başka bir siteye götürürse kullanıcı uygulama
 * çerçevesinde dolaşan kontrolsüz bir tarayıcıya düşer (ve `javascript:` /
 * özel şema bağlantıları çalışır). Kural: sayfa kendi içinde kalır, dış
 * bağlantılar sistem tarayıcısına/uygulamasına gider, gerisi engellenir.
 */
export type CmsNavigation = 'allow' | 'external' | 'block';

/** Sistem tarafından açılmasına izin verilen şemalar. */
const EXTERNAL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * `source={{ html }}` ilk yüklemede (ve sayfa içi `#bölüm` bağlantılarında)
 * `about:blank` ile başlar; bunlar sayfanın kendisidir.
 */
const isOwnDocument = (url: string) => url === 'about:blank' || url.startsWith('about:blank#');

export function decideCmsNavigation(url: string, isTopFrame?: boolean): CmsNavigation {
  if (isOwnDocument(url)) return 'allow';
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(url.trim())?.[1]?.toLowerCase();
  if (!scheme) return 'block';
  // Gömülü çerçeve (iframe, ör. video): yalnız web adresleri yüklenebilir.
  if (isTopFrame === false && (scheme === 'http:' || scheme === 'https:')) return 'allow';
  return EXTERNAL_SCHEMES.includes(scheme) ? 'external' : 'block';
}
