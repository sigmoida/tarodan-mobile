import { router, type Href } from 'expo-router';

/**
 * Sekme köklerinin URL'leri → kök yığındaki `(tabs)` grubunun o sekmesi. Grupsuz yazılan sekme yolları
 * (`/cart`, `/favorites`, …) da sekmeye çözülür.
 */
const TAB_PATHS: Record<string, string> = {
  '/': '/(tabs)',
  '/favorites': '/(tabs)/favorites',
  '/cart': '/(tabs)/cart',
  '/profile': '/(tabs)/profile',
  '/sell': '/(tabs)/sell',
};

/**
 * Hedef bir sekme kökü mü? Öyleyse `(tabs)` grubundaki karşılığı (sorgu korunur), değilse `null`.
 * Saf fonksiyon.
 */
export function tabHrefFor(href: string): string | null {
  if (!href || typeof href !== 'string') return null;
  const q = href.indexOf('?');
  const rawPath = q >= 0 ? href.slice(0, q) : href;
  const query = q >= 0 ? href.slice(q) : '';
  const path = rawPath.replace(/\/+$/, '') || '/';
  let target: string | undefined;
  if (path === '/(tabs)' || path.startsWith('/(tabs)/')) target = path;
  else target = TAB_PATHS[path];
  return target ? `${target}${query}` : null;
}

/**
 * Tek gezinme yardımcısı (yığın ekranlarından, push bildiriminden, reklamdan, derin bağlantıdan).
 * Hedef bir SEKME KÖKÜYSE `router.dismissTo`: kök yığında alttaki `(tabs)`'a geri döner ve o sekmeye
 * geçer — `push` ikinci bir `(tabs)` örneği iterdi (expo-router 6 `routing.js`; `StackTabBar` ile
 * aynı kalıp). `(tabs)` yığında yoksa mevcut ekranın yerine açar. Diğer hedefler `push`.
 */
export function navigateTo(href: string): void {
  const tab = tabHrefFor(href);
  if (tab) router.dismissTo(tab as Href);
  else router.push(href as Href);
}
