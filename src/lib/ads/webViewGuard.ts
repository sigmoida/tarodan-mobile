import { pathFromUrl } from '@/lib/deeplinks';
import { isOwnWebUrl } from './openAdLink';
import { isPurchasePath } from './purchasePath';

/** Adres, kendi sitemizin satın almaya götürmeyen bir sayfası mı. */
export function isAllowedOwnPage(url: string): boolean {
  if (!isOwnWebUrl(url)) return false;
  return !isPurchasePath(pathFromUrl(url) ?? '/');
}

/** Uygulama içi web ekranında bir yükleme izinli mi (true = WebView içinde yüklensin). */
export function shouldAllowWebRequest(url: string): boolean {
  return url === 'about:blank' || isAllowedOwnPage(url);
}
