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
 *  - Tempo (`createVerifyPacer`): kullanıcı 3DS'ten DÖNDÜKTEN sonraki ilk ~10 sn
 *    yoklama temposunda (3 sn), sonra en fazla 15 sn'de bir. 3DS sürerken
 *    (kullanıcı bankada, ödeme henüz onaylanmadı) en fazla 30 sn'de bir: bütçe
 *    dönüş anına ve başarı ekranına kalsın. Web'in kart formunda yoklama yok
 *    (PayTR'ye tam sayfa yönlendirme); web başarı sayfası ~1,2 sn arayla en fazla
 *    5 verify yapıyor. Mobil başarı ekranı da kendi kısa döngüsünü kullanıyor
 *    ama çağrıları AYNI bütçeden düşüyor.
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
/**
 * Kullanıcı 3DS'ten döndükten (ya da 3DS'siz yoklama başladıktan) sonraki bu
 * sürede verify her turda (callback hızlıysa ödeme hemen kesinleşsin).
 */
export const VERIFY_EARLY_PHASE_MS = 10_000;
/** Sonrasında verify en fazla bu aralıkla. */
export const VERIFY_SLOW_INTERVAL_MS = 15_000;
/**
 * 3DS sürerken (dönüş henüz algılanmadı) verify en fazla bu aralıkla. Sıfır
 * değil: dönüş algılanamazsa da verify tamamen durmasın.
 */
export const VERIFY_DURING_3DS_INTERVAL_MS = 30_000;
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

export type VerifyPacerOptions = VerifyOptions & {
  /**
   * 3DS sayfası açık, kullanıcı henüz dönmedi. Erken faz `markReturned()` ile
   * başlar; o zamana dek verify en fazla `VERIFY_DURING_3DS_INTERVAL_MS`'de bir.
   * `false` (3DS'siz yoklama: direct-form zaman aşımı, 3DS iptali) → erken faz
   * hemen başlar.
   */
  awaitingReturn?: boolean;
};

export type VerifyPacer = {
  /** Her yoklama turunda çağrılır; gerekiyorsa verify'ı arkada başlatır. */
  tick: () => void;
  /** Kullanıcı 3DS'ten döndü (WebView bankadan PayTR'ye döndü / uygulama öne geldi). */
  markReturned: () => void;
};

/**
 * Yoklama temposu: her yoklama turunda `tick()`. 3DS sürerken verify en fazla
 * 30 sn'de bir; kullanıcı döndükten sonra ilk ~10 sn her turda, sonra en fazla
 * 15 sn'de bir gider (bütçe ayrıca `requestVerify`'da). Hiç beklemez, hiç
 * fırlatmaz.
 */
export function createVerifyPacer(
  paymentId: string,
  { awaitingReturn = false, ...options }: VerifyPacerOptions = {},
): VerifyPacer {
  const createdAt = Date.now();
  let returnedAt: number | null = awaitingReturn ? null : createdAt;
  let lastAttemptAt: number | null = null;
  return {
    tick() {
      const now = Date.now();
      if (returnedAt === null) {
        // 3DS sürüyor: kullanıcı bankada, verify çoğunlukla boşa gider.
        if (now - (lastAttemptAt ?? createdAt) < VERIFY_DURING_3DS_INTERVAL_MS) return;
      } else {
        const early = now - returnedAt <= VERIFY_EARLY_PHASE_MS;
        if (!early && lastAttemptAt !== null && now - lastAttemptAt < VERIFY_SLOW_INTERVAL_MS) return;
      }
      lastAttemptAt = now;
      void requestVerify(paymentId, options);
    },
    markReturned() {
      if (returnedAt === null) returnedAt = Date.now();
    },
  };
}

/** Yalnız testler için: bütçe penceresini ve uçuştaki istekleri sıfırlar. */
export function __resetVerifyPacer(): void {
  sentAt.length = 0;
  inFlight.clear();
}
