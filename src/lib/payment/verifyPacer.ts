/**
 * `POST /payments/:id/verify` için tek kapı: sabit tempo + bütçe + zaman aşımı.
 *
 * Sunucu bu uca dakikada 10 istek sınırı koyuyor (`payment.controller.ts` →
 * `verifyPayment`: `@Throttle({ default: { limit: 10, ttl: 60000 } })`) ve her
 * çağrıda PayTR durum sorgusu yapıyor; yanıt yavaş olabilir. Pending olmayan
 * ödemede verify hiçbir şey yapmaz (`verifyPaymentFromClient`).
 *
 * Kurallar (misafir ve üye aynı, 3DS'in hangi aşamada olduğuna bakılmaz):
 *  - Kart formu durumu her 3 sn'de okur (`PAYMENT_STATUS_POLL_MS`), en fazla
 *    4 dk boyunca (`PAYMENT_POLL_DURATION_MS`: bankada uzun onay süreleri).
 *  - Verify o süre boyunca sabit aralıkla gider (`startVerifyLoop`): ilki ~3 sn'de,
 *    sonra 10 sn'de bir. Durum okuması verify'ı BEKLEMEZ; verify arkada ve
 *    zaman aşımıyla gider, `requestVerify` hiç reddetmez.
 *  - Aynı ödeme için uçuşta en fazla bir verify.
 *  - Bütçe: cihaz genelinde kayan 60 sn'de en fazla 8 verify (sunucu sınırı 10;
 *    throttle istemci + uç başına olduğu için bütçe global). Kart formu yoklaması
 *    bunun en fazla 6'sını kullanır (10 sn tempo zaten dakikada 6 eder); kalan 2
 *    sonuç ekranlarına (ödeme / üyelik başarı) her zaman kalır.
 *
 * Verify yalnız hızlandırıcı: ödemeyi PayTR callback'i de tamamlar. Bütçe
 * dolduğunda atlanan verify'ın yerine durum yoklaması sürer.
 */
import { paymentsApi } from '@/lib/api';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/** Sunucu sınırı (`verifyPayment` `@Throttle`): 60 sn'de 10 istek. */
export const VERIFY_SERVER_LIMIT_PER_MIN = 10;
/** İstemci bütçesi (tüm ekranlar toplam): sınırın altında pay bırakır. */
export const VERIFY_BUDGET_PER_MIN = 8;
/** Kart formu yoklamasının payı: kalan `VERIFY_BUDGET_PER_MIN − bu` sonuç ekranlarına ayrılır. */
export const VERIFY_POLL_BUDGET_PER_MIN = 6;
export const VERIFY_WINDOW_MS = 60_000;
/** Yoklamadaki ilk verify: banka sayfası hiç görünmese de (Non3D, frictionless) ilk saniyelerde. */
export const VERIFY_LOOP_FIRST_MS = 3_000;
/** Yoklamada sonraki verify'lar bu sabit aralıkla (dakikada 6). */
export const VERIFY_LOOP_INTERVAL_MS = 10_000;
/** Yoklama verify'ının zaman aşımı (axios `timeout` + bekleme sınırı). */
export const VERIFY_TIMEOUT_MS = 10_000;
/** Kart formunda durum okuma aralığı. */
export const PAYMENT_STATUS_POLL_MS = 3_000;
/** Kart formu yoklamasının toplam süresi: bankada uzun onay (3–4 dk) da kapsansın. */
export const PAYMENT_POLL_DURATION_MS = 4 * 60_000;

export type VerifyOptions = {
  guest?: boolean;
  /** Kart formu yoklaması: bütçenin yoklama payından (`VERIFY_POLL_BUDGET_PER_MIN`) düşer. */
  poll?: boolean;
};

/** Kayan pencere: gönderilen verify'ların zamanları (tüm ödemeler). */
const sentAt: number[] = [];
/** Ödeme başına uçuştaki verify. */
const inFlight = new Map<string, Promise<boolean>>();

/**
 * Bu tür verify için bütçede yer açılmasına kalan süre (ms); `0` = şimdi
 * gönderilebilir. Sonuç ekranları (varsayılan) tüm bütçeyi, yoklama (`poll`)
 * yalnız kendi payını görür.
 */
export function verifyBudgetWaitMs({ poll = false }: Pick<VerifyOptions, 'poll'> = {}, now: number = Date.now()): number {
  while (sentAt.length > 0 && now - sentAt[0] >= VERIFY_WINDOW_MS) sentAt.shift();
  const limit = poll ? VERIFY_POLL_BUDGET_PER_MIN : VERIFY_BUDGET_PER_MIN;
  if (sentAt.length < limit) return 0;
  // Yer açılması için en eski (n − limit + 1) gönderim pencereden çıkmalı.
  return sentAt[sentAt.length - limit] + VERIFY_WINDOW_MS - now;
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
 * Verify'ı bütçe varsa gönderir. Çağıran beklemek ZORUNDA değil.
 * Söz, verify ödemeyi tamamladıysa (`completed: true`) `true`; bütçe dolu, hata
 * (429 dahil) ya da zaman aşımında `false` ile çözülür. Hiç reddetmez.
 * Aynı ödeme için uçuşta verify varsa yenisini göndermez, onu döner.
 */
export function requestVerify(
  paymentId: string,
  { guest = false, poll = false }: VerifyOptions = {},
): Promise<boolean> {
  const pending = inFlight.get(paymentId);
  if (pending) return pending;
  const now = Date.now();
  if (verifyBudgetWaitMs({ poll }, now) > 0) return Promise.resolve(false);
  sentAt.push(now);

  const request = sendVerify(paymentId, guest).then(
    (res) => unwrapEnvelope<{ completed?: unknown }>(res as { data?: unknown } | null | undefined).completed === true,
    () => false,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
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

/**
 * Kart formu yoklamasının verify döngüsü: ilki `VERIFY_LOOP_FIRST_MS`'de, sonra
 * her `VERIFY_LOOP_INTERVAL_MS`'de bir arkada verify (yoklama payından).
 * Durum okumasından bağımsız; dönen işlev döngüyü durdurur.
 */
export function startVerifyLoop(paymentId: string, { guest = false }: Pick<VerifyOptions, 'guest'> = {}): () => void {
  let timer = setTimeout(function fire() {
    void requestVerify(paymentId, { guest, poll: true });
    timer = setTimeout(fire, VERIFY_LOOP_INTERVAL_MS);
  }, VERIFY_LOOP_FIRST_MS);
  return () => clearTimeout(timer);
}

/** Yalnız testler için: bütçe penceresini ve uçuştaki istekleri sıfırlar. */
export function __resetVerifyPacer(): void {
  sentAt.length = 0;
  inFlight.clear();
}
