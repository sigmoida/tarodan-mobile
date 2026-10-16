import { stripLocalePrefix } from '@/lib/deeplinks';
import { ownWebPageUrl } from '@/lib/web';

/**
 * Mobilden kaldırılan site sayfaları — TEK kaynak. Reklam linki
 * (`openAdLink`), bildirim/push (`toMobileRoute`) ve derin bağlantı
 * (`+native-intent` → `toMobileRoute`) aynı kararı buradan alır.
 *
 * Ürün kararı: mobilde yalnız altı yasal belge kaldı (`@/lib/legal/webDocs`).
 * Bilgi sayfaları (hakkımızda, rehberler, alıcı koruması …) ve CMS
 * (`/sayfa/*`) uygulama içi web ekranında web sürümüyle açılır; SSS'nin
 * native karşılığı Yardım Merkezi'dir.
 */

/** Uygulama içi web ekranı (`app/in-app-web.tsx`). */
export const IN_APP_WEB_ROUTE = '/in-app-web';

/** Kendi sitemizin bir adresini uygulama içi web ekranında açan rota. */
export function inAppWebHref(url: string): string {
  return `${IN_APP_WEB_ROUTE}?url=${encodeURIComponent(url)}`;
}

/** Native karşılığı olan kaldırılmış sayfalar. */
const NATIVE_REPLACEMENT: Readonly<Record<string, string>> = {
  faq: '/help',
};

/** Web görünümünde açılan kaldırılmış sayfalar: yol başı → web'deki yol başı. */
const WEB_ONLY_HEADS: Readonly<Record<string, string>> = {
  about: 'about',
  authenticity: 'authenticity',
  'collectors-guide': 'collectors-guide',
  guides: 'guides',
  'size-guide': 'size-guide',
  'payment-options': 'payment-options',
  'shipping-delivery': 'shipping-delivery',
  'security-features': 'security-features',
  'intellectual-property': 'intellectual-property',
  'buyer-protection': 'buyer-protection',
  'returns-exchanges': 'returns-exchanges',
  sayfa: 'sayfa',
  'secure-swap': 'secure-swap',
  'platform-service-fee': 'platform-service-fee',
  // Eski mobil rota adları (eski `tarodan://` bağlantıları) → web adı.
  'guvenli-takas': 'secure-swap',
  'platform-hizmet-bedeli': 'platform-service-fee',
};

export type RemovedPageTarget = { kind: 'route'; route: string } | { kind: 'web'; url: string };

/**
 * Yol (locale öneki ve sorgu olabilir) kaldırılmış bir sayfaya mı gidiyor;
 * öyleyse hedefi: native yedek rota ya da web adresi (locale ve sorgu korunur).
 * Kaldırılmış sayfa değilse `null`.
 */
export function resolveRemovedPage(pathWithQuery: string): RemovedPageTarget | null {
  const qIndex = pathWithQuery.indexOf('?');
  const rawPath = (qIndex === -1 ? pathWithQuery : pathWithQuery.slice(0, qIndex)).split('#')[0]!;
  const query = qIndex === -1 ? '' : pathWithQuery.slice(qIndex);
  const raw = rawPath.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const bare = stripLocalePrefix(raw) || '/';
  const [head, ...rest] = bare.split('/').filter(Boolean);
  if (!head) return null;

  const native = NATIVE_REPLACEMENT[head];
  if (native) return { kind: 'route', route: native };

  const webHead = WEB_ONLY_HEADS[head];
  if (!webHead) return null;
  const localePrefix = raw.slice(0, raw.length - bare.length);
  const webPath = `/${[webHead, ...rest].join('/')}`;
  return { kind: 'web', url: ownWebPageUrl(`${localePrefix}${webPath}${query}`) };
}
