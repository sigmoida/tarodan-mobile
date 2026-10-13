import { Linking } from 'react-native';
import { router } from 'expo-router';
import { pathFromUrl, stripLocalePrefix } from '@/lib/deeplinks';
import { toMobileRoute } from '@/utils/notificationRoute';
import { ownWebPageUrl } from '@/lib/web';
import { isPurchasePath } from './purchasePath';
import { safeAdHref } from './safeAdHref';

/** Uygulama içi web ekranı (`app/in-app-web.tsx`) — mobil karşılığı olmayan site yolları için. */
export const IN_APP_WEB_ROUTE = '/in-app-web';

function hostOf(url: string | undefined): string | null {
  const m = url?.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1]!.toLowerCase() : null;
}

/** Kendi web sitemizin host'ları — bunlara giden link uygulama içinde açılır. */
const OWN_HOSTS = new Set(
  [
    'tarodan.com.tr',
    'www.tarodan.com.tr',
    'staging.tarodan.com.tr',
    hostOf(process.env.EXPO_PUBLIC_WEB_URL),
  ].filter((h): h is string => !!h),
);

/** Uygulama içi web ekranının açabileceği adres mi (https + kendi sitemiz). */
export function isOwnWebUrl(url: string | null | undefined): boolean {
  if (!url || !/^https:\/\//i.test(url)) return false;
  const host = hostOf(url);
  return !!host && OWN_HOSTS.has(host);
}

/** Hedefin ne olacağı — saf çözümleme, yan etkisiz (test edilebilir). */
export type AdLinkTarget =
  | { kind: 'route'; route: string }
  /** Dış site → sistem tarayıcısı. */
  | { kind: 'external'; url: string }
  /** Kendi sitemiz, mobil karşılığı yok → uygulama içi web ekranı. */
  | { kind: 'web'; url: string }
  /**
   * Hiçbir şey açılmaz. `reason` engelin nedenini ayırt eder: `unsafe` = güvensiz
   * şema/boş, `purchase` = dijital satışa (üyelik, boost) götüren hedef.
   */
  | { kind: 'blocked'; reason: 'unsafe' | 'purchase' };

/** Web yolu → mobil rota adı farklı olanlar. */
function renamedRoute(seg: string[]): string | null {
  const [head, id] = seg;
  switch (head) {
    case 'manufacturers':
      return id ? `/ureticiler/${id}` : '/ureticiler';
    case 'u':
      return id ? `/seller/${id}` : null;
    case 'wishlist':
      return '/favorites';
    case 'secure-swap':
      return '/guvenli-takas';
    case 'platform-service-fee':
      return '/platform-hizmet-bedeli';
    case 'sell':
      return '/(tabs)/sell';
    default:
      return null;
  }
}

/** Web ile mobilde AYNI adı taşıyan, tek segmentli sayfalar. */
const SAME_NAME_PAGES = new Set([
  'cart',
  'support',
  'faq',
  'guides',
  'size-guide',
  'collectors-guide',
  'payment-options',
  'shipping-delivery',
  'authenticity',
  'buyer-protection',
  'security-features',
  'about',
  'contact',
  'newsletter',
  'cookies',
  'distance-sales',
  'intellectual-property',
  'privacy',
  'refund-policy',
  'seller-agreement',
  'terms',
]);

/**
 * Web yoluyla AYNI adla mobilde gerçek rotası olan, çok segmentli ekranlar
 * (`app/brands/[slug]` vb.). Yalnız `app/` ağacında bulunan adlar girer —
 * bilinmeyen rotaya push yok kuralı (test `app/` dizinini tarayarak doğrular).
 */
export const NATIVE_SAME_PATH_HEADS = new Set([
  'brands',
  'category',
  'sayfa',
  'models',
  'returns-exchanges',
  'following',
]);

function webUrlFor(linkUrl: string, path: string): string {
  if (isOwnWebUrl(linkUrl)) return linkUrl;
  return ownWebPageUrl(path);
}

/**
 * Reklam linki iç rota ("/listings?manufacturer=Hot+Wheels"), kendi sitemizin
 * mutlak adresi ("https://tarodan.com.tr/listings") ya da dış URL olabilir.
 * Sıra: güvenlik → dış site → satın alma filtresi → mobil rota eşlemesi →
 * uygulama içi web. Bilinmeyen bir yola ASLA `router.push` yapılmaz.
 */
export function resolveAdLink(linkUrl: string | null | undefined): AdLinkTarget {
  const raw = safeAdHref(linkUrl);
  if (!raw) return { kind: 'blocked', reason: 'unsafe' };
  // `HTTP://…` şeması büyük harfle yazılsa da yol çözümü ve satın alma kapısı aynı çalışsın.
  const safe = raw.replace(/^https?:\/\//i, (m) => m.toLowerCase());

  const host = hostOf(safe);
  if (host && !OWN_HOSTS.has(host)) return { kind: 'external', url: safe };

  const path = pathFromUrl(safe) ?? '/';
  const [rawPath] = path.split('?');
  // Sorgu (filtre) korunur; locale öneki rotadan SOYULUR (`/en/listings` diye rota yok).
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
  const barePath = stripLocalePrefix(rawPath!.replace(/\/+$/, '') || '/');

  if (isPurchasePath(barePath)) return { kind: 'blocked', reason: 'purchase' };

  // İlan listesi eşleyiciye VERİLMEZ: `toMobileRoute` `/listings`'i sorgusuz
  // arama sekmesine çeviriyor, reklamın filtresi (`?manufacturer=…`) düşerdi.
  // Mobil `app/listings` web ile aynı sorgu parametrelerini okuyor.
  if (barePath === '/listings') return { kind: 'route', route: `${barePath}${query}` };

  const seg = barePath.split('/').filter(Boolean);
  const renamed = renamedRoute(seg);
  if (renamed) return { kind: 'route', route: renamed };
  if (seg.length === 1 && SAME_NAME_PAGES.has(seg[0]!)) {
    return { kind: 'route', route: barePath };
  }

  // `toMobileRoute`'un eşlemediği ama mobilde AYNI yolla var olan ekranlar:
  // WebView'e düşmeden native açılır (eskiden `?? path` ile push ediliyordu).
  if (seg[0] && NATIVE_SAME_PATH_HEADS.has(seg[0])) {
    return { kind: 'route', route: `${barePath}${query}` };
  }

  const mapped = toMobileRoute(path);
  if (mapped) return { kind: 'route', route: mapped };

  // Kök ya da eşlenemeyen yol: bilinmeyen rotaya push yok, web uygulama içinde açılır.
  if (seg.length === 0) return { kind: 'route', route: '/' };
  return { kind: 'web', url: webUrlFor(safe, path) };
}

/**
 * Bağlantı dijital satışa (üyelik, boost) mı götürüyor? Karar TEK yerden
 * (`resolveAdLink`) gelir: http/https, locale öneki ve göreli yol aynı kuralla
 * değerlendirilir. Dış host'lar satın alma hedefi sayılmaz.
 */
export function isPurchaseLink(linkUrl: string | null | undefined): boolean {
  const target = resolveAdLink(linkUrl);
  return target.kind === 'blocked' && target.reason === 'purchase';
}

/** Reklam bağlantısını aç; açılan bir şey olduysa `true`. */
export function openAdLink(linkUrl: string | null | undefined): boolean {
  const target = resolveAdLink(linkUrl);
  switch (target.kind) {
    case 'route':
      router.push(target.route as any);
      return true;
    case 'external':
      Linking.openURL(target.url).catch(() => {});
      return true;
    case 'web':
      router.push(`${IN_APP_WEB_ROUTE}?url=${encodeURIComponent(target.url)}` as any);
      return true;
    default:
      return false;
  }
}
