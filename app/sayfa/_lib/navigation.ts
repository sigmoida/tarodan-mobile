/**
 * CMS sayfası WebView gezinme kararı. İçerik sunucudan gelen HTML'dir; içindeki
 * bir bağlantı WebView'i başka bir siteye götürürse kullanıcı uygulama
 * çerçevesinde dolaşan kontrolsüz bir tarayıcıya düşer (ve `javascript:` /
 * özel şema bağlantıları çalışır). Kural: sayfa kendi içinde kalır, kendi
 * alan adımıza ve göreli (`/sayfa/kvkk`) bağlantılar UYGULAMA İÇİNDE açılır,
 * eşlenemeyen / dış bağlantılar sistem tarayıcısına gider, gerisi engellenir.
 *
 * İki ayrı soru ve iki ayrı fonksiyon:
 *  - `decideCmsNavigation`: bu istekle NE yapılır (allow | app | external | block)?
 *  - `isUserInitiated`: app/external, kullanıcı dokunuşundan mı geldi? Script
 *    (`location=`), `<meta http-equiv=refresh>` ve iframe kaynaklı yönlendirmeler
 *    kullanıcı bilmeden uygulamayı/tarayıcıyı açmasın.
 */
import { deepLinkConfig, isNeverNavigatePath, pathFromUrl, stripLocalePrefix } from '@/lib/deeplinks';
import { toMobileRoute } from '@/utils/notificationRoute';
import { webBaseUrl as webBase } from '@/lib/web';

export type CmsDecision =
  | { action: 'allow' }
  | { action: 'block' }
  /** Uygulama içi rota (expo-router yolu). */
  | { action: 'app'; route: string }
  /** Sistem tarayıcısı/uygulaması için MUTLAK URL. */
  | { action: 'external'; url: string };

export type CmsNavigation = CmsDecision['action'];

/** Sistem tarafından açılmasına izin verilen şemalar. */
const EXTERNAL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * `source={{ html }}` ilk yüklemede (ve sayfa içi `#bölüm` bağlantılarında)
 * `about:blank` ile başlar; bunlar sayfanın kendisidir.
 */
const isOwnDocument = (url: string) =>
  url === 'about:blank' || url.startsWith('about:blank#') || url.startsWith('#');

const hostOf = (url?: string): string | null =>
  url?.match(/^https?:\/\/([^/?#:@\\]+)(?::\d+)?(?=[/?#]|$)/i)?.[1]?.toLowerCase() ?? null;

/** Kendi alan adlarımız (`paths.json#hosts`, `www.` önekli hâlleri, env'deki web adresi). */
const isOwnHost = (host: string): boolean => {
  const own = [...deepLinkConfig.hosts, hostOf(webBase())].filter((h): h is string => !!h);
  const bare = host.replace(/^www\./, '');
  return own.some((h) => h === host || h === bare);
};

/**
 * Yol(+sorgu) → uygulama rotası. Önce push/derin bağlantıyla PAYLAŞILAN
 * eşleme (`toMobileRoute`); CMS sayfaları (`/sayfa/<slug>`) o eşlemede yok
 * (paths.json'da teyit bekliyor), ama mobilde bu rota var — yalnız burada eşlenir.
 */
function routeForPath(pathWithQuery: string): string | null {
  try {
    if (isNeverNavigatePath(pathWithQuery)) return null; // ödeme dönüşleri tarayıcıda kalır
    const mapped = toMobileRoute(pathWithQuery);
    if (mapped) return mapped;
    const path = stripLocalePrefix(pathWithQuery.split('?')[0]!.replace(/\/+$/, ''));
    const slug = /^\/sayfa\/([^/]+)$/.exec(path)?.[1];
    return slug ? `/sayfa/${slug}` : null;
  } catch {
    // Bozuk yüzde-kodlu içerik (`%E0%A4%A`) eşleyicide atabilir; tarayıcıya düş.
    return null;
  }
}

/** Kendi alan adımızdaki ya da göreli yol: uygulamada açılır, olmazsa sitede. */
function decideOwnPath(rawPath: string): CmsDecision {
  const pathWithQuery = rawPath.split('#')[0]!;
  const route = routeForPath(pathWithQuery);
  return route
    ? { action: 'app', route }
    : { action: 'external', url: `${webBase()}${pathWithQuery}` };
}

export function decideCmsNavigation(url: string, isTopFrame?: boolean): CmsDecision {
  if (isOwnDocument(url)) return { action: 'allow' };
  // Şema büyük/küçük harf duyarsız (`HTTPS://`); çözücü küçük harf bekler.
  const target = url.trim().replace(/^https?:/i, (m) => m.toLowerCase());
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(target)?.[1]?.toLowerCase();

  // Gömülü çerçeve (iframe, ör. video): yalnız web adresleri yüklenebilir;
  // iframe'in uygulamayı/tarayıcıyı açmasına yer yok.
  if (isTopFrame === false) {
    return scheme === 'http:' || scheme === 'https:' ? { action: 'allow' } : { action: 'block' };
  }

  if (!scheme) {
    if (!target) return { action: 'block' };
    // Protokol-göreli `//host/yol` → https; aksi halde göreli yol (`/sayfa/kvkk`,
    // `sayfa/kvkk`). Göreli bağlantı sessizce yutulmaz: uygulama rotasına ya da
    // web adresine çözülür. (Çözümde boş yol → web kökü.)
    if (target.startsWith('//')) return decideCmsNavigation(`https:${target}`, isTopFrame);
    const path = pathFromUrl(target);
    return path ? decideOwnPath(path) : { action: 'external', url: webBase() };
  }

  if (!EXTERNAL_SCHEMES.includes(scheme)) return { action: 'block' };
  if (scheme === 'http:' || scheme === 'https:') {
    const host = hostOf(target);
    if (host && isOwnHost(host)) {
      const path = pathFromUrl(target);
      return path ? decideOwnPath(path) : { action: 'external', url: target };
    }
  }
  return { action: 'external', url: target };
}

/**
 * Gezinme kullanıcı dokunuşundan mı geldi?
 *  - iOS: WebView `navigationType === 'click'` verir; script/meta-refresh `other`.
 *  - Android: `navigationType` hep `other` ve dokunuş bilgisi yok; ilk yükleme
 *    bittikten sonra gelen ana çerçeve gezinmeleri kullanıcıdan sayılır
 *    (yükleme SIRASINDA gelenler — `<meta http-equiv=refresh>`, satır içi
 *    script — engellenir). Sayfa yüklendikten sonra zamanlayıcıyla yapılan
 *    script yönlendirmesi Android'de dokunuştan ayırt EDİLEMEZ; kabul edilen sınır.
 *  - Gömülü çerçeve: asla.
 */
export function isUserInitiated(req: {
  platform: string;
  navigationType?: string;
  isTopFrame?: boolean;
  initialLoadDone: boolean;
}): boolean {
  if (req.isTopFrame === false) return false;
  if (req.platform === 'ios') return req.navigationType === 'click';
  if (req.platform === 'android') return req.initialLoadDone;
  return false;
}
