import { pathFromUrl } from '@/lib/deeplinks';
import { isOwnWebUrl } from './openAdLink';
import { isPurchasePath } from './purchasePath';

/**
 * Uygulama içi web ekranındaki bir yüklemenin kaderi:
 * - `allow`: WebView içinde yüklensin
 * - `external`: sistem tarayıcısında açılsın (üst çerçevedeki dış https linki)
 * - `block`: hiçbir şey olmasın (satın alma yolu, özel şema, http)
 */
export type WebRequestDecision = 'allow' | 'external' | 'block';

/** Adres, kendi sitemizin satın almaya götürmeyen bir sayfası mı. */
export function isAllowedOwnPage(url: string): boolean {
  if (!isOwnWebUrl(url)) return false;
  return !isPurchasePath(pathFromUrl(url) ?? '/');
}

export function decideWebRequest(url: string, isTopFrame: boolean): WebRequestDecision {
  // Gömülü çerçeveler (iframe) gezinme değildir; engellenirse boş kalırlar.
  if (!isTopFrame) return 'allow';
  if (url === 'about:blank') return 'allow';
  if (isOwnWebUrl(url)) return isAllowedOwnPage(url) ? 'allow' : 'block';
  // Dış https linki sessizce yutulmaz — sistem tarayıcısı açar.
  if (/^https:\/\//i.test(url)) return 'external';
  return 'block';
}
