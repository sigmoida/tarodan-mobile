/**
 * Verify temposu, bütçesi ve zaman aşımı (`verifyPacer.ts`).
 *
 * Sunucu: `POST /payments/:id/verify` → `@Throttle({ default: { limit: 10, ttl: 60000 } })`,
 * her çağrıda PayTR durum sorgusu. İstemci kayan 60 sn'de en fazla 8 verify gönderir
 * (yoklama en fazla 6, kalan sonuç ekranlarına); yoklamada verify ilki ~3 sn'de, sonra
 * sabit 10 sn'de bir gider. Verify hiç beklenmek zorunda değil.
 */
jest.mock('@/lib/api', () => ({
  paymentsApi: { verify: jest.fn(), verifyGuest: jest.fn() },
}));

import { paymentsApi } from '@/lib/api';
import {
  __resetVerifyPacer,
  PAYMENT_POLL_DURATION_MS,
  requestVerify,
  startVerifyLoop,
  verifyBudgetWaitMs,
  VERIFY_BUDGET_PER_MIN,
  VERIFY_LOOP_FIRST_MS,
  VERIFY_LOOP_INTERVAL_MS,
  VERIFY_POLL_BUDGET_PER_MIN,
  VERIFY_SERVER_LIMIT_PER_MIN,
  VERIFY_TIMEOUT_MS,
  VERIFY_WINDOW_MS,
} from '../verifyPacer';

const verify = paymentsApi.verify as jest.Mock;
const verifyGuest = paymentsApi.verifyGuest as jest.Mock;

/** Gönderim zamanları (sahte saatle ms). */
let sends: number[];

/** Her kayan 60 sn penceredeki en yüksek verify sayısı. */
const maxPerWindow = (times: number[]) =>
  Math.max(0, ...times.map((t) => times.filter((u) => u >= t && u < t + VERIFY_WINDOW_MS).length));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(Date.UTC(2026, 9, 13, 9, 0, 0));
  __resetVerifyPacer();
  sends = [];
  const record = () => {
    sends.push(Date.now());
    return Promise.resolve({ data: { completed: false, status: 'process_skipped' } });
  };
  verify.mockReset().mockImplementation(record);
  verifyGuest.mockReset().mockImplementation(record);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('requestVerify', () => {
  it('üye verify\'ı, misafir verifyGuest\'i zaman aşımıyla çağırır; ödeme tamamlandıysa true', async () => {
    verify.mockResolvedValueOnce({ data: { completed: true, status: 'completed_now' } });
    await expect(requestVerify('p-1')).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('p-1', { timeout: VERIFY_TIMEOUT_MS });

    verifyGuest.mockResolvedValueOnce({ data: { data: { completed: true } } }); // zarflı yanıt
    await expect(requestVerify('p-2', { guest: true })).resolves.toBe(true);
    expect(verifyGuest).toHaveBeenCalledWith('p-2', { timeout: VERIFY_TIMEOUT_MS });
  });

  it('hiç reddetmez: 429, ağ hatası, senkron fırlatma → false', async () => {
    verify.mockRejectedValueOnce(Object.assign(new Error('throttled'), { response: { status: 429 } }));
    await expect(requestVerify('p-1')).resolves.toBe(false);
    verify.mockImplementationOnce(() => {
      throw new TypeError('boom');
    });
    await expect(requestVerify('p-2')).resolves.toBe(false);
  });

  it('bütçe: kayan 60 sn\'de en fazla 8 (sunucu sınırı 10); pencere kayınca yeniden açılır', async () => {
    expect(VERIFY_BUDGET_PER_MIN).toBeLessThan(VERIFY_SERVER_LIMIT_PER_MIN);
    // Farklı ödemeler aynı sayaçtan düşer (sunucu throttle'ı istemci başına).
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => requestVerify(`p-${i}`)));
    expect(sends).toHaveLength(VERIFY_BUDGET_PER_MIN);
    expect(results.every((r) => r === false)).toBe(true);

    jest.advanceTimersByTime(VERIFY_WINDOW_MS - 1);
    await requestVerify('late-1');
    expect(sends).toHaveLength(VERIFY_BUDGET_PER_MIN); // hâlâ pencerede

    jest.advanceTimersByTime(1);
    await requestVerify('late-2');
    expect(sends).toHaveLength(VERIFY_BUDGET_PER_MIN + 1);
  });

  it('aynı ödeme için uçuşta verify varken yenisi gönderilmez', async () => {
    let resolve!: (v: unknown) => void;
    verify.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const first = requestVerify('p-1');
    const second = requestVerify('p-1');
    expect(second).toBe(first);
    expect(verify).toHaveBeenCalledTimes(1);

    resolve({ data: { completed: true } });
    await expect(first).resolves.toBe(true);
    await requestVerify('p-1'); // uçuşta yok: yenisi gider
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('zaman aşımı: yanıt gelmezse false ile çözülür, uçuş kaydı düşer, sonraki verify gider', async () => {
    verify.mockImplementationOnce(() => new Promise(() => undefined)); // asılı kalır
    const hung = requestVerify('p-1');
    let settled = false;
    void hung.then(() => (settled = true));

    await jest.advanceTimersByTimeAsync(VERIFY_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await expect(hung).resolves.toBe(false);

    await requestVerify('p-1');
    expect(verify).toHaveBeenCalledTimes(2);
  });
});

describe('startVerifyLoop (yoklama temposu: faz yok, sabit aralık)', () => {
  const secondsSince = (start: number) => sends.map((t) => (t - start) / 1000);

  it('ilki ~3 sn\'de, sonra 10 sn\'de bir (3, 13, 23, 33, 43, 53)', async () => {
    const start = Date.now();
    const stop = startVerifyLoop('p-1');
    await jest.advanceTimersByTimeAsync(60_000);
    stop();
    expect(VERIFY_LOOP_FIRST_MS).toBe(3000);
    expect(VERIFY_LOOP_INTERVAL_MS).toBe(10_000);
    expect(secondsSince(start)).toEqual([3, 13, 23, 33, 43, 53]);
  });

  it('yoklama süresi boyunca (4 dk) düzenli; her 60 sn pencerede ≤ yoklama payı (6) < bütçe (8)', async () => {
    const start = Date.now();
    const stop = startVerifyLoop('p-1');
    await jest.advanceTimersByTimeAsync(PAYMENT_POLL_DURATION_MS);
    stop();
    expect(PAYMENT_POLL_DURATION_MS).toBeGreaterThanOrEqual(3 * 60_000);
    const seconds = secondsSince(start);
    expect(seconds).toHaveLength(24);
    seconds.slice(1).forEach((s, i) => expect(s - seconds[i]).toBe(10)); // aralık sabit
    expect(maxPerWindow(sends)).toBe(VERIFY_POLL_BUDGET_PER_MIN);
    expect(VERIFY_POLL_BUDGET_PER_MIN).toBeLessThan(VERIFY_BUDGET_PER_MIN);
  });

  it('art arda yoklamalar (3DS iptal → doğrulama) yoklama payını aşamaz; sonuç ekranına yer kalır', async () => {
    let stop = startVerifyLoop('p-1');
    await jest.advanceTimersByTimeAsync(55_000);
    stop();
    stop = startVerifyLoop('p-1'); // yeniden başlayan yoklama: ilk verify yine 3 sn'de
    await jest.advanceTimersByTimeAsync(5_000);
    stop();
    expect(maxPerWindow(sends)).toBeLessThanOrEqual(VERIFY_POLL_BUDGET_PER_MIN);
    // Sonuç ekranı (varsayılan, tüm bütçe) hâlâ gönderebilir.
    expect(verifyBudgetWaitMs()).toBe(0);
    expect(verifyBudgetWaitMs({ poll: true })).toBeGreaterThan(0);
  });

  it('misafir döngüsü verifyGuest çağırır; durdurulunca verify gitmez', async () => {
    const stop = startVerifyLoop('p-1', { guest: true });
    await jest.advanceTimersByTimeAsync(3000);
    expect(verifyGuest).toHaveBeenCalledWith('p-1', { timeout: VERIFY_TIMEOUT_MS });
    expect(verify).not.toHaveBeenCalled();
    stop();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(verifyGuest).toHaveBeenCalledTimes(1);
  });
});

describe('verifyBudgetWaitMs (bütçede yer açılmasına kalan süre)', () => {
  it('yer varsa 0; dolunca en eski gönderimin pencereden çıkışına kalan süre', async () => {
    expect(verifyBudgetWaitMs()).toBe(0);
    for (let i = 0; i < VERIFY_BUDGET_PER_MIN; i++) {
      void requestVerify(`p-${i}`);
      await jest.advanceTimersByTimeAsync(1000); // 0, 1, …, 7. sn
    }
    // Şimdi 8. sn: ilk gönderim (0. sn) 60. sn'de çıkar.
    expect(verifyBudgetWaitMs()).toBe(52_000);
    // Yoklama payı (6) 6. gönderimle doldu: 3. gönderim (2. sn) çıkınca yer açılır.
    expect(verifyBudgetWaitMs({ poll: true })).toBe(54_000);
    await jest.advanceTimersByTimeAsync(52_000);
    expect(verifyBudgetWaitMs()).toBe(0);
  });
});
