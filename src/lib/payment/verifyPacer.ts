/**
 * `POST /payments/:id/verify` için tek kapı: tempo + bütçe + zaman aşımı.
 *
 * Sunucu bu uca dakikada 10 istek sınırı koyuyor (`payment.controller.ts` →
 * `verifyPayment`: `@Throttle({ default: { limit: 10, ttl: 60000 } })`) ve her
 * çağrıda PayTR durum sorgusu yapıyor; yanıt yavaş olabilir. Kart formu her
 * 3 sn'de verify'ı BEKLEYİP sonra durumu okuyordu: istekler 429 alıyor, yavaş
 * bir verify de durum okumasını geciktiriyordu.
 *
 * Kurallar (misafir ve üye aynı):
 *  - Durum okuması (status / status-guest) verify'ı BEKLEMEZ. Verify arkada ve
 *    zaman aşımıyla gider; `requestVerify` hiç reddetmez.
 *  - Tempo (`createVerifyPacer`): ilk ~10 sn yoklama temposunda (3 sn), sonra
 *    en fazla 15 sn'de bir. Web'in kart formunda yoklama yok (PayTR'ye tam sayfa
 *    yönlendirme); web başarı sayfası ~1,2 sn arayla en fazla 5 verify yapıyor.
 *    Mobil başarı ekranı da kendi kısa döngüsünü kullanıyor ama çağrıları AYNI
 *    bütçeden düşüyor.
 *  - Bütçe: cihaz genelinde kayan 60 sn'lik pencerede en fazla 8 verify (sınırın
 *    altında pay). Throttle sayacı istemci + uç başına, ödeme başına değil; bu
 *    yüzden bütçe de global.
 *  - Aynı ödeme için uçuşta bir verify varken yenisi gönderilmez.
 *
 * Verify yalnız hızlandırıcı: ödemeyi PayTR callback'i de tamamlar. Bütçe
 * dolduğunda atlanan verify'ın yerine durum yoklaması sürer.
 */
import { paymentsApi } from '@/lib/api';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/** Sunucu sınırı (`verifyPayment` `@Throttle`): 60 sn'de 10 istek. */
export const VERIFY_SERVER_LIMIT_PER_MIN = 10;
/** İstemci bütçesi: sınırın altında pay bırakır. */
export const VERIFY_BUDGET_PER_MIN = 8;
export const VERIFY_WINDOW_MS = 60_000;
/** Yoklamanın ilk bu kadarında verify her turda (callback hızlıysa ödeme hemen kesinleşsin). */
export const VERIFY_EARLY_PHASE_MS = 10_000;
/** Sonrasında verify en fazla bu aralıkla. */
export const VERIFY_SLOW_INTERVAL_MS = 15_000;
/** Tek verify isteğinin zaman aşımı (axios `timeout` + bekleme sınırı). */
export const VERIFY_TIMEOUT_MS = 10_000;

export type VerifyOptions = { guest?: boolean };

/** Kayan pencere: gönderilen verify'ların zamanları (tüm ödemeler). */
const sentAt: number[] = [];
/** Ödeme başına uçuştaki verify. */
const inFlight = new Map<string, Promise<boolean>>();

function hasBudget(now: number): boolean {
  while (sentAt.length > 0 && now - sentAt[0] >= VERIFY_WINDOW_MS) sentAt.shift();
  return sentAt.length < VERIFY_BUDGET_PER_MIN;
}

function sendVerify(paymentId: string, guest: boolean): Promise<unknown> {
  const config = { timeout: VERIFY_TIMEOUT_MS };
  try {
    return guest ? paymentsApi.verifyGuest(paymentId, config) : paymentsApi.verify(paymentId, config);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Verify'ı bütçe varsa arkada gönderir. Çağıran beklemek ZORUNDA değil.
 * Söz, verify ödemeyi tamamladıysa (`completed: true`) `true`; bütçe dolu, hata
 * (429 dahil) ya da zaman aşımında `false` ile çözülür. Hiç reddetmez.
 * Aynı ödeme için uçuşta verify varsa yenisini göndermez, onu döner.
 */
export function requestVerify(paymentId: string, { guest = false }: VerifyOptions = {}): Promise<boolean> {
  const pending = inFlight.get(paymentId);
  if (pending) return pending;
  const now = Date.now();
  if (!hasBudget(now)) return Promise.resolve(false);
  sentAt.push(now);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = sendVerify(paymentId, guest).then(
    (res) => unwrapEnvelope<{ completed?: unknown }>(res as { data?: unknown } | null | undefined).completed === true,
    () => false,
  );
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), VERIFY_TIMEOUT_MS);
  });
  const settled: Promise<boolean> = Promise.race([request, timedOut]).then((completed) => {
    clearTimeout(timer);
    if (inFlight.get(paymentId) === settled) inFlight.delete(paymentId);
    return completed;
  });
  inFlight.set(paymentId, settled);
  return settled;
}

/** Bu ödeme için uçuştaki verify'ın sonucu; uçuşta yoksa `false`. Yeni istek göndermez. */
export function pendingVerify(paymentId: string): Promise<boolean> {
  return inFlight.get(paymentId) ?? Promise.resolve(false);
}

/**
 * Yoklama temposu: her yoklama turunda `tick()`; verify ilk ~10 sn her turda,
 * sonra en fazla 15 sn'de bir gider (bütçe ayrıca `requestVerify`'da). Hiç
 * beklemez, hiç fırlatmaz.
 */
export function createVerifyPacer(paymentId: string, options: VerifyOptions = {}): { tick: () => void } {
  const startedAt = Date.now();
  let lastAttemptAt: number | null = null;
  return {
    tick() {
      const now = Date.now();
      const early = now - startedAt <= VERIFY_EARLY_PHASE_MS;
      if (!early && lastAttemptAt !== null && now - lastAttemptAt < VERIFY_SLOW_INTERVAL_MS) return;
      lastAttemptAt = now;
      void requestVerify(paymentId, options);
    },
  };
}

/** Yalnız testler için: bütçe penceresini ve uçuştaki istekleri sıfırlar. */
export function __resetVerifyPacer(): void {
  sentAt.length = 0;
  inFlight.clear();
}
