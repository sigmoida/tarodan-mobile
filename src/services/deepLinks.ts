/**
 * Derin bağlantı yönlendirmesi (universal link + custom scheme).
 *
 * Yol → mobil rota eşlemesi push bildirimleriyle PAYLAŞILIR (`toMobileRoute`);
 * ikinci bir kopya tutulmaz. Ödeme dönüş URL'leri (`/payment/success|fail`)
 * bilinçli olarak eşlenmez — o tur ödeme WebView'i içinde yakalanır; uygulama
 * dışına çıkarsa akış kopar.
 */
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { toMobileRoute } from '@/utils/notificationRoute';

/** URL'den yol + sorgu dizesini çıkar (şema/host'u atarak). */
export function pathFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/);
  if (!match) return null;
  const [, scheme, afterScheme] = match;

  let path: string;
  if (scheme === 'http' || scheme === 'https') {
    // https://host/yol?q — host'u at, yol+sorgu'yu tut.
    const idx = afterScheme.search(/[/?]/);
    path = idx === -1 ? '' : afterScheme.slice(idx);
  } else {
    // custom scheme'de host segmenti yol gibi davranır: tarodan://product/p-1
    path = afterScheme;
  }

  if (!path) path = '/';
  else if (path.startsWith('?')) path = `/${path}`;
  else if (!path.startsWith('/')) path = `/${path}`;

  // Ardışık slash'ları tekile indir (ör. https://host//product/p-1).
  path = path.replace(/\/{2,}/g, '/');

  return path === '/' || path === '/?' ? null : path;
}

function handle(url: string | null | undefined) {
  if (!url) return;
  const path = pathFromUrl(url);
  if (!path) return;
  const route = toMobileRoute(path);
  if (!route) return; // eşlenmeyen yol (ör. ödeme dönüşü) sessizce yok sayılır
  router.push(route as never);
}

/** Kök layout'ta bir kez çağrılır; aboneliği iptal eden temizleyiciyi döner. */
export function setupDeepLinkRouting(): () => void {
  // Soğuk başlatma: uygulama bağlantıyla açıldı.
  Linking.getInitialURL()
    .then(handle)
    .catch(() => {});
  // Uygulama açıkken gelen bağlantı.
  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}
