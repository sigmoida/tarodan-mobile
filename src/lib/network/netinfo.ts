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
  addEventListener(listener: (state: NetInfoStateLike) => void): () => void;
  /** Önbelleği atlayıp güncel durumu sorar (erişilebilirlik sınamasını yeniden yapar). */
  refresh(): Promise<NetInfoStateLike>;
  fetch(): Promise<NetInfoStateLike>;
}

let cached: NetInfoLike | null | undefined;

export function getNetInfo(): NetInfoLike | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- tembel + try/catch: modül yoksa çökme
    const mod = require('@react-native-community/netinfo');
    const impl = (mod?.default ?? mod) as NetInfoLike | undefined;
    cached =
      impl && typeof impl.addEventListener === 'function' && typeof impl.fetch === 'function'
        ? impl
        : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** YALNIZ TEST: modül önbelleğini sıfırlar. */
export function resetNetInfoForTests(): void {
  cached = undefined;
}
