import { pathFromUrl } from '@/lib/deeplinks';
import { isOwnWebUrl } from './openAdLink';
import { isPurchasePath } from './purchasePath';
import { isAppEmbedPath } from '@/lib/legal/webDocs';

/**
 * Uygulama içi web ekranındaki bir yüklemenin kaderi:
 * - `allow`: WebView içinde yüklensin
 * - `external`: sistem tarayıcısında açılsın (üst çerçevedeki dış https linki)
 * - `block`: hiçbir şey olmasın (satın alma yolu, özel şema, http)
 */
export type WebRequestDecision = 'allow' | 'external' | 'block';

/**
 * WebView'in gezinme kipi:
 * - `site` (varsayılan, `app/in-app-web`): kendi sitemizin satın almaya
 *   götürmeyen her sayfası uygulama içinde kalır.
 * - `embed` (yasal belgeler): yalnız uygulama modu sayfaları (`/app/*`,
 *   `/en/app/*`) içeride kalır; kendi sitemizin diğer sayfaları ve dış linkler
 *   sistem tarayıcısında açılır (belgedeki `mailto:`/`tel:` de sisteme gider).
 *   Satın alma yolları iki kipte de hiçbir yoldan açılmaz.
 */
export type WebViewMode = 'site' | 'embed';

/** Adres, kendi sitemizin satın almaya götürmeyen bir sayfası mı. */
export function isAllowedOwnPage(url: string): boolean {
  if (!isOwnWebUrl(url)) return false;
  return !isPurchasePath(pathFromUrl(url) ?? '/');
}

export function decideWebRequest(
  url: string,
  isTopFrame: boolean,
  mode: WebViewMode = 'site',
): WebRequestDecision {
  // Gömülü çerçeveler (iframe) gezinme değildir; engellenirse boş kalırlar.
  if (!isTopFrame) return 'allow';
  if (url === 'about:blank') return 'allow';
  if (isOwnWebUrl(url)) {
    if (!isAllowedOwnPage(url)) return 'block';
    if (mode === 'site') return 'allow';
    return isAppEmbedPath(pathFromUrl(url) ?? '/') ? 'allow' : 'external';
  }
  if (mode === 'embed' && /^(mailto|tel):/i.test(url)) return 'external';
  // Dış https linki sessizce yutulmaz — sistem tarayıcısı açar.
  if (/^https:\/\//i.test(url)) return 'external';
  return 'block';
}
