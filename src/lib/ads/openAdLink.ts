import { Linking } from 'react-native';
import { router } from 'expo-router';
import { pathFromUrl, stripLocalePrefix } from '@/lib/deeplinks';
import { toMobileRoute } from '@/utils/notificationRoute';
import { navigateTo } from '@/lib/navigation/goTo';
import { isOtherEnvironmentHost, isOwnWebUrl as isOwnSiteUrl, ownWebHosts, ownWebPageUrl } from '@/lib/web';
import { looksAbsoluteHttpUrl, parseStrictUrl } from '@/lib/security/url';
import { LEGAL_WEB_DOCS } from '@/lib/legal/webDocs';
import { IN_APP_WEB_ROUTE, inAppWebHref, resolveRemovedPage } from '@/lib/navigation/removedPages';
import { isPurchasePath } from './purchasePath';
import { safeAdHref } from './safeAdHref';

/** Uygulama içi web ekranı (`app/in-app-web.tsx`) — mobil karşılığı olmayan site yolları için. */
export { IN_APP_WEB_ROUTE };

/** Katı ayrıştırılmış `http(s)://` host'u (`@/lib/security/url`); geçersiz / göreli → `null`. */
function hostOf(url: string | null | undefined): string | null {
  return parseStrictUrl(url, { allowHttp: true })?.host ?? null;
}

/**
 * Kendi web sitemizin host'ları — bunlara giden link uygulama içinde açılır. ORTAM BAŞINA
 * (`ownWebHosts`): production build'inde staging alan adı YOK.
 */
const OWN_HOSTS = ownWebHosts();

/** Uygulama içi web ekranının açabileceği adres mi (katı https + bu ortamın kendi sitesi). */
export function isOwnWebUrl(url: string | null | undefined): boolean {
  return isOwnSiteUrl(url, OWN_HOSTS);
}

/** Bizim ama bu ortamın olmayan site (production'da staging) — hiçbir yoldan açılmaz. */
export function isOtherEnvironmentUrl(url: string | null | undefined): boolean {
  return isOtherEnvironmentHost(hostOf(url ?? undefined), OWN_HOSTS);
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
    case 'sell':
      return '/(tabs)/sell';
    default:
      return null;
  }
}

/**
 * Web ile mobilde AYNI adı taşıyan, tek segmentli sayfalar. Yasal belgeler
 * native rotadır (web'in uygulama modu sayfasını gösterir — `@/lib/legal/webDocs`).
 * Mobilden kaldırılan sayfalar `resolveRemovedPage`'den geçer.
 */
export const SAME_NAME_PAGES = new Set<string>([
  'cart',
  'support',
  'contact',
  'newsletter',
  ...LEGAL_WEB_DOCS,
]);

/**
 * Web yoluyla AYNI adla mobilde gerçek rotası olan, çok segmentli ekranlar
 * (`app/brands/[slug]` vb.). Yalnız `app/` ağacında bulunan adlar girer —
 * bilinmeyen rotaya push yok kuralı (test `app/` dizinini tarayarak doğrular).
 */
export const NATIVE_SAME_PATH_HEADS = new Set([
  'brands',
  'category',
  'models',
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
  // Mutlak ama katı ayrıştırmadan geçmeyen adres (`https://x@staging…`, `:8443`, `\`): açılmaz.
  if (!host && looksAbsoluteHttpUrl(safe)) return { kind: 'blocked', reason: 'unsafe' };
  // Production'da staging sitesi (ya da tersi): ne uygulama içinde ne tarayıcıda açılır.
  if (isOtherEnvironmentHost(host, OWN_HOSTS)) return { kind: 'blocked', reason: 'unsafe' };
  if (host && !OWN_HOSTS.has(host)) return { kind: 'external', url: safe };

  const path = pathFromUrl(safe) ?? '/';
  const [rawPath] = path.split('?');
  // Sorgu (filtre) korunur; locale öneki rotadan SOYULUR (`/en/listings` diye rota yok).
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
  const barePath = stripLocalePrefix(rawPath!.replace(/\/+$/, '') || '/');

  if (isPurchasePath(barePath)) return { kind: 'blocked', reason: 'purchase' };

  // Mobilden kaldırılan sayfalar (SSS → Yardım; bilgi/CMS → web görünümü) — tek kaynak.
  const removed = resolveRemovedPage(path);
  if (removed) return removed.kind === 'route' ? { kind: 'route', route: removed.route } : removed;

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
      // Sekme hedefi (`/cart`, `/favorites`, `/`) alttaki `(tabs)`'a döner; diğerleri push.
      navigateTo(target.route);
      return true;
    case 'external':
      Linking.openURL(target.url).catch(() => {});
      return true;
    case 'web':
      router.push(inAppWebHref(target.url) as any);
      return true;
    default:
      return false;
  }
}
