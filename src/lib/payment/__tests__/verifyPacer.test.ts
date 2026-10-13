/**
 * Verify temposu, bütçesi ve zaman aşımı (`verifyPacer.ts`).
 *
 * Sunucu: `POST /payments/:id/verify` → `@Throttle({ default: { limit: 10, ttl: 60000 } })`,
 * her çağrıda PayTR durum sorgusu. İstemci kayan 60 sn'de en fazla 8 verify gönderir,
 * yoklamada ilk ~10 sn her tur, sonra ~15 sn'de bir; verify hiç beklenmek zorunda değil.
 */
jest.mock('@/lib/api', () => ({
  paymentsApi: { verify: jest.fn(), verifyGuest: jest.fn() },
}));

import { paymentsApi } from '@/lib/api';
import {
  __resetVerifyPacer,
  createVerifyPacer,
  pendingVerify,
  requestVerify,
  VERIFY_BUDGET_PER_MIN,
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
    expect(pendingVerify('p-1')).toBe(first);

    resolve({ data: { completed: true } });
    await expect(first).resolves.toBe(true);
    await expect(pendingVerify('p-1')).resolves.toBe(false); // uçuşta yok
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

describe('createVerifyPacer (yoklama temposu)', () => {
  /** 3 sn'de bir yoklama turu, `seconds` boyunca. */
  async function pollFor(seconds: number, pacer = createVerifyPacer('p-1')) {
    for (let t = 3; t <= seconds; t += 3) {
      await jest.advanceTimersByTimeAsync(3000);
      pacer.tick();
    }
  }

  it('ilk ~10 sn her tur (3, 6, 9. sn), sonra ~15 sn\'de bir (24, 39, 54…)', async () => {
    const start = Date.now();
    await pollFor(60);
    expect(sends.map((t) => (t - start) / 1000)).toEqual([3, 6, 9, 24, 39, 54]);
  });

  it('120 sn yoklama (kart formunun 40 turu): her 60 sn pencerede ≤ bütçe < sunucu sınırı', async () => {
    await pollFor(120);
    expect(maxPerWindow(sends)).toBeLessThanOrEqual(VERIFY_BUDGET_PER_MIN);
    expect(maxPerWindow(sends)).toBeLessThan(VERIFY_SERVER_LIMIT_PER_MIN);
  });

  it('art arda yoklamalar (3DS iptal → doğrulama, başarı ekranı) aynı bütçeden düşer', async () => {
    await pollFor(57); // kart formu
    await pollFor(9, createVerifyPacer('p-1')); // yeniden başlayan yoklama: yeni erken evre
    for (let i = 0; i < 5; i++) {
      // başarı ekranı döngüsü (1,5 sn arayla 5 deneme)
      void requestVerify('p-1');
      await jest.advanceTimersByTimeAsync(1500);
    }
    expect(maxPerWindow(sends)).toBeLessThanOrEqual(VERIFY_BUDGET_PER_MIN);
  });

  it('misafir pacer verifyGuest çağırır; tick hiç beklemez ve fırlatmaz', async () => {
    verifyGuest.mockImplementation(() => new Promise(() => undefined));
    const pacer = createVerifyPacer('p-1', { guest: true });
    await jest.advanceTimersByTimeAsync(3000);
    expect(pacer.tick()).toBeUndefined();
    expect(verifyGuest).toHaveBeenCalledWith('p-1', { timeout: VERIFY_TIMEOUT_MS });
    expect(verify).not.toHaveBeenCalled();
  });
});
