import { withTimeout } from '@/utils/withTimeout';

/**
 * Çıkışın push iptali ile sonraki girişin push kaydı arasındaki SIRA.
 *
 * Sunucu iptali cihaz token'ına göre TÜM kayıtları deaktive eder. Çıkıştaki iptal arka planda
 * gider (çıkış ağı beklemez); B hemen giriş yaparsa B'nin aynı cihaz token'ıyla yaptığı yeni
 * kayıt, geç kalan iptalden ÖNCE sunucuya ulaşıp iptalle kapanabilirdi (B bildirim almaz).
 * Bu yüzden bekleyen iptal tutulur; yeni giriş ve push kaydı önce onu (sınırlı süre) bekler.
 * Süre dolarsa istek iptal edilir (`AbortController`) ve iptalin sonuçlanması beklenir — artık
 * sunucuya ulaşamayacağı noktadan sonra kayıt devam eder.
 *
 * `./push` lazy require: push → api → authStore import zinciriyle döngü olmasın.
 */

/** Bekleyen iptal için en uzun bekleme (giriş / kayıt bunu aşkın bekletilmez). */
export const PUSH_REVOKE_SETTLE_MS = 5000;

let pending: { promise: Promise<void>; controllers: AbortController[] } | null = null;

/** Bu cihazın push iptalini başlatır (beklenmez); öncekiyle birlikte bekleyen iptale eklenir. */
export function startPushRevoke(): Promise<void> {
  const controller = new AbortController();
  let run: Promise<void>;
  try {
    const { unregisterPushNotifications } = require('./push');
    run = Promise.resolve(unregisterPushNotifications({ signal: controller.signal })).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    run = Promise.resolve();
  }
  const previous = pending;
  const combined = Promise.all([previous?.promise, run]).then(() => undefined);
  const entry = { promise: combined, controllers: [...(previous?.controllers ?? []), controller] };
  pending = entry;
  void combined.then(() => {
    if (pending === entry) pending = null;
  });
  return combined;
}

/**
 * Bekleyen iptal varsa sonuçlanmasını bekler (en çok `boundMs`). Süre dolarsa istek iptal edilir
 * ve iptalin sonuçlanması beklenir; dönüşte bekleyen iptal sunucuya artık ulaşamaz.
 */
export async function settlePendingPushRevoke(boundMs = PUSH_REVOKE_SETTLE_MS): Promise<void> {
  const current = pending;
  if (!current) return;
  const settled = await withTimeout(current.promise.then(() => true), boundMs);
  if (settled) return;
  current.controllers.forEach((c) => c.abort());
  await current.promise;
}

/** YALNIZ TEST. */
export function resetPushRevocationForTests(): void {
  pending = null;
}
