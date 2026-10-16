/**
 * Çıkışın push iptali, sonraki girişin push kaydından ÖNCE sonuçlanmalı: sunucu iptali cihaz
 * token'ının tüm kayıtlarını kapatır; geç kalan iptal B'nin yeni kaydını da kapatırdı.
 * Bekleme sınırlıdır; aşılırsa istek iptal edilir (AbortController) ve iptalin sonuçlanması
 * beklenir — dönüşte bekleyen iptal artık sunucuya ulaşamaz.
 */
const mockUnregister = jest.fn();
jest.mock('../push', () => ({
  unregisterPushNotifications: (...a: unknown[]) => mockUnregister(...a),
}));

import {
  resetPushRevocationForTests,
  settlePendingPushRevoke,
  startPushRevoke,
} from '../pushRevocation';

beforeEach(() => {
  jest.useFakeTimers();
  mockUnregister.mockReset();
  resetPushRevocationForTests();
});
afterEach(() => jest.useRealTimers());

it('bekleyen iptal yoksa hemen döner', async () => {
  await expect(settlePendingPushRevoke()).resolves.toBeUndefined();
});

it('bekleyen iptal sonuçlanınca devam edilir (kayıt iptalden sonra)', async () => {
  let resolveRevoke!: () => void;
  mockUnregister.mockReturnValue(new Promise<void>((r) => (resolveRevoke = r)));
  void startPushRevoke();

  let settled = false;
  const settle = settlePendingPushRevoke().then(() => {
    settled = true;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(settled).toBe(false);

  resolveRevoke();
  await settle;
  expect(settled).toBe(true);
});

it('sınır aşılırsa istek iptal edilir ve iptalin sonuçlanması beklenir', async () => {
  let signal!: AbortSignal;
  mockUnregister.mockImplementation((opts: { signal: AbortSignal }) => {
    signal = opts.signal;
    return new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve()));
  });
  void startPushRevoke();

  const settle = settlePendingPushRevoke(5000);
  await jest.advanceTimersByTimeAsync(5000);
  await settle;

  expect(signal.aborted).toBe(true);
});
