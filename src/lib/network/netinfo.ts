/**
 * `@react-native-community/netinfo` için güvenli sarmalayıcı — TEK giriş noktası.
 *
 * Paket native modül (RNCNetInfo) ister. Henüz yeniden derlenmemiş bir dev-client'ta modül yoktur
 * ve paketi `require` etmek ya da çağırmak fırlatır; uygulama bu yüzden ÇÖKMEMELİ. Modül
 * yüklenemezse `null` döner ve çağıranlar "bağlantı var" varsayar (izleme sessizce devre dışı).
 * `require` tembeldir (modül yükleme sırasına bağlanmasın, testte `jest.mock` ile değiştirilebilsin).
 */

/** NetInfo durumunun bu uygulamanın kullandığı alt kümesi. */
export interface NetInfoStateLike {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}

export interface NetInfoLike {
  /** Abonelikte güncel durumu hemen yollar. */
  addEventListener(listener: (state: NetInfoStateLike) => void): () => void;
  /** Önbelleği atlayıp güncel durumu sorar (erişilebilirlik sınamasını yeniden yapar). */
  refresh(): Promise<NetInfoStateLike>;
  configure?(config: Record<string, unknown>): void;
}

/** Sınama zaman aşımları (ms): başarısızken sık (5 sn), başarılıyken seyrek (60 sn). */
export const REACHABILITY_SHORT_TIMEOUT_MS = 5_000;
export const REACHABILITY_LONG_TIMEOUT_MS = 60_000;
export const REACHABILITY_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Erişilebilirlik sınaması KENDİ API'mizin herkese açık canlılık ucuna gider (Google'ın
 * `generate_204`'ü değil): Google'ı engelleyen ağlarda yanlış "internet yok" çıkmasın, sınama
 * gerçekten uygulamanın konuştuğu sunucuyu ölçsün. `/health/live` DB'ye dokunmaz, kimlik istemez.
 * Herhangi bir HTTP yanıtı (5xx dahil) internetin VAR olduğunu kanıtlar: API'nin kendi arızası
 * "internet bağlantınızı kontrol ediniz" demek değildir.
 */
export function buildReachabilityConfig(apiBaseUrl: string): Record<string, unknown> {
  return {
    reachabilityUrl: `${apiBaseUrl.replace(/\/$/, '')}/health/live`,
    reachabilityMethod: 'GET',
    reachabilityTest: (response: { status: number }): Promise<boolean> =>
      Promise.resolve(response.status > 0 && response.status < 500),
    reachabilityShortTimeout: REACHABILITY_SHORT_TIMEOUT_MS,
    reachabilityLongTimeout: REACHABILITY_LONG_TIMEOUT_MS,
    reachabilityRequestTimeout: REACHABILITY_REQUEST_TIMEOUT_MS,
  };
}

/** `configure` dinleyicileri durdurur: tek sefer, ilk `addEventListener`'dan ÖNCE çağrılır. */
function configureReachability(impl: NetInfoLike): void {
  try {
    // Tembel: `@/lib/api/client` ağır bir modül zinciri; yalnız izleme gerçekten başlarken yüklenir.
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- döngüsel import / yükleme sırası
    const { getApiBaseUrl } = require('@/lib/api/client') as { getApiBaseUrl: () => string };
    impl.configure?.(buildReachabilityConfig(getApiBaseUrl()));
  } catch {
    /* varsayılan yapılandırma ile devam: izleme yine çalışır */
  }
}

let cached: NetInfoLike | null | undefined;

export function getNetInfo(): NetInfoLike | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- tembel + try/catch: modül yoksa çökme
    const mod = require('@react-native-community/netinfo');
    const impl = (mod?.default ?? mod) as NetInfoLike | undefined;
    cached =
      impl && typeof impl.addEventListener === 'function' && typeof impl.refresh === 'function'
        ? impl
        : null;
    if (cached) configureReachability(cached);
  } catch {
    cached = null;
  }
  return cached;
}

/** YALNIZ TEST: modül önbelleğini sıfırlar. */
export function resetNetInfoForTests(): void {
  cached = undefined;
}
