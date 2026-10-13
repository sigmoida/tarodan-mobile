import { deepLinkConfig } from '@/lib/deeplinks';

/**
 * Kendi web sitemizin adresi — TEK kaynak (CLAUDE.md §5). Eskiden reklam
 * linkleri (`openAdLink`), paylaşım linkleri (`utils/share`) ve CMS sayfası
 * gezinmesi (`app/sayfa/_lib/navigation`) aynı türetimi ayrı ayrı yapıyordu.
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
