import { deepLinkConfig, productionHosts } from '@/lib/deeplinks';
import { strictHttpsHost } from '@/lib/security/url';

/**
 * Kendi web sitemizin adresi — TEK kaynak (CLAUDE.md › Principles): reklam linkleri
 * (`openAdLink`), paylaşım linkleri (`utils/share`) ve yasal belge ekranları
 * (`@/lib/legal/webDocs`) aynı türetimi kullanır.
 */

/** Prod web adresi: derin bağlantı yapılandırmasındaki birincil alan adı (`paths.json#hosts[0]`). */
export const DEFAULT_WEB_BASE = `https://${deepLinkConfig.hosts[0]}`;

/** Web taban adresi: env (staging/prod) > prod. Sondaki `/` yok. */
export function webBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_WEB_BASE).replace(/\/+$/, '');
}

/** Kendi sitemizde bir yolun mutlak adresi. */
export function ownWebPageUrl(path: string): string {
  return `${webBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Production alan adları + `www.` eşleri. */
const productionWebHosts = (): string[] => productionHosts().flatMap((h) => [h, `www.${h}`]);

/** Bilinen TÜM alan adlarımız (production + staging, `www.` eşleri dahil). */
const allKnownWebHosts = (): string[] =>
  deepLinkConfig.hosts.flatMap((h) => [h, `www.${h}`]);

/**
 * Bu build'in uygulama İÇİNDE açabileceği kendi alan adları — ORTAM BAŞINA:
 *  - production: yalnız production alan adları. Staging (`staging.tarodan.com.tr`) ve
 *    env'deki başka bir adres sayılmaz: production uygulaması test ortamının sayfasını /
 *    oturumunu ASLA göstermez.
 *  - preview / development: production + staging + `EXPO_PUBLIC_WEB_URL`'in host'u.
 */
export function ownWebHosts(
  environment: string | undefined = process.env.EXPO_PUBLIC_ENVIRONMENT,
  webUrl: string | undefined = process.env.EXPO_PUBLIC_WEB_URL,
): ReadonlySet<string> {
  if (environment === 'production') return new Set(productionWebHosts());
  const envHost = strictHttpsHost(webUrl);
  return new Set([...allKnownWebHosts(), ...(envHost ? [envHost] : [])]);
}

/**
 * Host bizim ama BU ortamın değil mi (production build'inde staging alan adı)? Böyle bir
 * adres ne uygulama içinde ne sistem tarayıcısında açılır, ne de rota kaynağı sayılır.
 */
export function isOtherEnvironmentHost(
  host: string | null | undefined,
  hosts: ReadonlySet<string> = ownWebHosts(),
): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return allKnownWebHosts().includes(h) && !hosts.has(h);
}

/**
 * Bu ortamın KENDİ sitesine giden katı `https://` adresi mi (`parseStrictUrl`: `user@`, port,
 * ters eğik çizgi yok). Uygulama içi web ekranı / WebView yalnız bunları yükler.
 */
export function isOwnWebUrl(
  url: string | null | undefined,
  hosts: ReadonlySet<string> = ownWebHosts(),
): boolean {
  const host = strictHttpsHost(url);
  return !!host && hosts.has(host);
}
