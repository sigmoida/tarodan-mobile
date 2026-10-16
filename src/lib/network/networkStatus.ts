import { useSyncExternalStore } from 'react';
import { logger, safeError } from '@/services/logger';
import { getNetInfo, type NetInfoStateLike } from './netinfo';

/**
 * Bağlantı durumu — modül düzeyinde TEK kaynak (React dışında; `useSyncExternalStore` ile okunur).
 * Yalnız istemci durumu: sunucu verisi değil, fetch yok (CLAUDE.md §8).
 *
 * Çevrimdışı = cihaz ağa bağlı DEĞİL (`isConnected === false`) YA DA ağa bağlı ama internete
 * ulaşılamıyor (`isInternetReachable === false`; ör. veri bitmiş, sınırsız Wi-Fi). `null` (henüz
 * bilinmiyor: iOS'ta ilk olay, modül yok) ÇEVRİMİÇİ sayılır — yanlış alarm vermektense susar.
 */
export function deriveOnline(state: NetInfoStateLike): boolean {
  return !(state.isConnected === false || state.isInternetReachable === false);
}

let online = true;
let known = false; // en az bir gerçek ölçüm geldi mi
let stopNative: (() => void) | null = null;
let startCount = 0;
const listeners = new Set<(online: boolean) => void>();

function apply(state: NetInfoStateLike): boolean {
  const next = deriveOnline(state);
  known = true;
  if (next !== online) {
    online = next;
    for (const l of [...listeners]) l(next);
  }
  return next;
}

/** Şu an çevrimiçi mi (ölçüm yoksa / modül yoksa `true`). */
export function isOnline(): boolean {
  return online;
}

/** En az bir gerçek ölçüm geldi mi (`false`: izleme kapalı ya da modül yok). */
export function isNetworkStatusKnown(): boolean {
  return known;
}

/** Durum DEĞİŞTİĞİNDE çağrılır (abonelikte anlık çağrı yok). Dönen fonksiyon aboneliği bırakır. */
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Native izlemeyi başlatır (sayaçlı: her başlatan kendi `stop`'unu çağırır, son çıkış izlemeyi
 * keser). Durum `addEventListener` ile gelir (açılış durumu da: başlangıç `true` varsayımından
 * farklıysa, yani çevrimdışı açılışta, ilk ölçüm bir geçiş olarak yayınlanır), ek olarak `fetch`
 * ile. Modül yoksa no-op.
 */
export function startNetworkTracking(): () => void {
  startCount += 1;
  if (startCount === 1) {
    const netInfo = getNetInfo();
    if (netInfo) {
      try {
        stopNative = netInfo.addEventListener((state) => {
          apply(state);
        });
        netInfo
          .fetch()
          .then((state) => {
            apply(state);
          })
          .catch((err) => logger.warn('NetInfo fetch failed', { err: safeError(err) }));
      } catch (err) {
        stopNative = null;
        logger.warn('NetInfo tracking unavailable', { err: safeError(err) });
      }
    }
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    startCount -= 1;
    if (startCount === 0) {
      try {
        stopNative?.();
      } catch {
        /* en iyi çaba */
      }
      stopNative = null;
    }
  };
}

/**
 * "Tekrar dene": erişilebilirlik sınamasını yeniden yapar, güncel durumu döner. Modül yoksa ya da
 * sınama başarısızsa mevcut durumu döner (fırlatmaz).
 */
export async function recheckNetwork(): Promise<boolean> {
  const netInfo = getNetInfo();
  if (!netInfo) return online;
  try {
    return apply(await netInfo.refresh());
  } catch (err) {
    logger.warn('NetInfo refresh failed', { err: safeError(err) });
    return online;
  }
}

/** Bileşen hook'u: bağlantı durumu değişince yeniden çizer. */
export function useNetworkStatus(): { isOnline: boolean } {
  const isOnlineNow = useSyncExternalStore(
    (onChange) => subscribeOnline(onChange),
    isOnline,
    isOnline,
  );
  return { isOnline: isOnlineNow };
}

/** YALNIZ TEST: durumu ve abonelikleri sıfırlar. */
export function resetNetworkStatusForTests(): void {
  try {
    stopNative?.();
  } catch {
    /* yoksay */
  }
  stopNative = null;
  startCount = 0;
  online = true;
  known = false;
  listeners.clear();
}
