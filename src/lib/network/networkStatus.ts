import { logger, safeError } from '@/services/logger';
import { getNetInfo, type NetInfoStateLike } from './netinfo';

/**
 * Bağlantı durumu — modül düzeyinde TEK karar noktası (React dışında; sunucu verisi değil, fetch
 * yok: CLAUDE.md §8). Hem çevrimdışı diyaloğu hem TanStack `onlineManager` AYNI kararı dinler
 * (`subscribeOnline`), ham NetInfo olayını değil: kısa titreşimler hiçbirini tetiklemez
 * (diyalog çıkmaz, `refetchOnReconnect` fırtınası olmaz).
 *
 * Karar kuralı:
 * - `isConnected === false` (ağ yok): `OFFLINE_CONFIRM_MS` boyunca kesintisiz sürerse çevrimdışı.
 * - yalnız `isInternetReachable === false` (ağ var, probe başarısız): `REACHABILITY_PERSISTENCE_MS`
 *   sürerse VE o anda yapılan ikinci bir sınama (`refresh`) da başarısızsa çevrimdışı. Tek bir
 *   yavaş/engelli probe (yavaş hücresel, arka plandan dönüş) çevrimdışı demek değildir.
 * - çevrimiçine dönüş ANINDA yayınlanır (`null` = bilinmiyor çevrimiçi sayılır; olay akışında).
 * - `refresh` sonucu `isInternetReachable == null` ise "bilinmiyor": önceki karar korunur, yalnız
 *   kesin `true` çevrimiçi yapar (iOS'ta refresh sonrası reachability geçici `null` olur).
 */
export const OFFLINE_CONFIRM_MS = 1800;
export const REACHABILITY_PERSISTENCE_MS = 4000;

let online = true;
let stopNative: (() => void) | null = null;
let startCount = 0;
let confirmTimer: ReturnType<typeof setTimeout> | null = null;
let pendingNoNetwork = false;
/** Doğrulama sayacı: iptal edilen/eskiyen zamanlayıcı ve `refresh` sonuçları yok sayılır. */
let epoch = 0;
const listeners = new Set<(online: boolean) => void>();

function publish(next: boolean): void {
  if (next === online) return;
  online = next;
  for (const l of [...listeners]) l(next);
}

function cancelConfirm(): void {
  epoch += 1;
  if (confirmTimer !== null) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
}

/** Şu an çevrimiçi mi (ölçüm yoksa / modül yoksa `true`). */
export function isOnline(): boolean {
  return online;
}

/** Çevrimdışı şüphesi var ama karar henüz verilmedi (doğrulama bekliyor). */
export function isOfflinePending(): boolean {
  return confirmTimer !== null;
}

/** Karar DEĞİŞTİĞİNDE çağrılır (abonelikte anlık çağrı yok). Dönen fonksiyon aboneliği bırakır. */
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Kesin çevrimdışı mı (bir olay ya da `refresh` sonucu). */
function isOfflineState(state: NetInfoStateLike): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/** Çevrimdışı şüphesinde (henüz kesin değil) doğrulama başlatır; zaten bekliyorsa dokunmaz. */
function armConfirm(state: NetInfoStateLike): void {
  if (!online) return;
  const noNetwork = state.isConnected === false;
  if (confirmTimer !== null) {
    // Aynı türde şüphe zaten doğrulanıyor; yalnız "ağ yok"a yükselme kısa süreyi yeniden kurar.
    if (pendingNoNetwork || !noNetwork) return;
    cancelConfirm();
  }
  pendingNoNetwork = noNetwork;
  const myEpoch = epoch;
  confirmTimer = setTimeout(
    () => {
      confirmTimer = null;
      if (myEpoch !== epoch) return;
      if (noNetwork) {
        publish(false);
        return;
      }
      // Ağ var ama probe başarısız: ikinci bir sınama yap, o da başarısızsa çevrimdışı.
      const netInfo = getNetInfo();
      if (!netInfo) return;
      void netInfo
        .refresh()
        .then((fresh) => {
          if (myEpoch !== epoch) return;
          applyDefinitive(fresh);
        })
        .catch((err) => logger.warn('NetInfo confirm refresh failed', { err: safeError(err) }));
    },
    noNetwork ? OFFLINE_CONFIRM_MS : REACHABILITY_PERSISTENCE_MS,
  );
}

/** Olay akışı: çevrimdışı şüphe → doğrulama; aksi halde (null dahil) hemen çevrimiçi. */
function applyEvent(state: NetInfoStateLike): void {
  if (isOfflineState(state)) {
    armConfirm(state);
    return;
  }
  cancelConfirm();
  publish(true);
}

/**
 * Kesin sonuç (kullanıcı "Tekrar dene" / doğrulama `refresh`'i): çevrimdışı hemen yayınlanır; `null`
 * (bilinmiyor) önceki kararı korur, yalnız kesin `true` çevrimiçi yapar.
 */
function applyDefinitive(state: NetInfoStateLike): boolean {
  cancelConfirm();
  if (isOfflineState(state)) {
    publish(false);
  } else if (state.isConnected === true && state.isInternetReachable === true) {
    publish(true);
  }
  return online;
}

/**
 * Native izlemeyi başlatır (sayaçlı: her başlatan kendi `stop`'unu çağırır, son çıkış izlemeyi
 * keser). NetInfo abonelikte güncel durumu hemen yollar: çevrimdışı açılış da aynı kuraldan geçer.
 * Modül yoksa no-op.
 */
export function startNetworkTracking(): () => void {
  startCount += 1;
  if (startCount === 1) {
    const netInfo = getNetInfo();
    if (netInfo) {
      try {
        stopNative = netInfo.addEventListener(applyEvent);
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
      cancelConfirm();
    }
  };
}

/**
 * "Tekrar dene": erişilebilirlik sınamasını yeniden yapar, güncel kararı döner. Modül yoksa ya da
 * sınama başarısızsa mevcut kararı döner (fırlatmaz).
 */
export async function recheckNetwork(): Promise<boolean> {
  const netInfo = getNetInfo();
  if (!netInfo) return online;
  try {
    return applyDefinitive(await netInfo.refresh());
  } catch (err) {
    logger.warn('NetInfo refresh failed', { err: safeError(err) });
    return online;
  }
}

/**
 * YALNIZ TEST: durumu sıfırlar (karar çevrimiçi; abonelere — ör. `onlineManager` — bildirilir) ve
 * zamanlayıcıları temizler. Aboneliklere DOKUNMAZ: `onlineManager` bağlantısı kalır.
 */
export function resetNetworkStatusForTests(): void {
  try {
    stopNative?.();
  } catch {
    /* yoksay */
  }
  stopNative = null;
  startCount = 0;
  cancelConfirm();
  publish(true);
}
