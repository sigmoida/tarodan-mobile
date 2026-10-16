/**
 * Socket kimlik hatasından kurtarma: sunucu geçersiz token'da `error` gönderip bağlantıyı kendi
 * tarafında keser (socket.io istemcisi bunu kendiliğinden yeniden kurmaz). İstemci sessiz
 * refresh'i tetikler ve yeni token'la yeniden bağlanır; deneme sayısı sınırlıdır ve sunucu
 * bağlantıyı kabul edince (`connected`) sıfırlanır. Çıkışta socket kapanır.
 */
type Listener = (payload?: any) => void;

const mockSockets: any[] = [];
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    const listeners = new Map<string, Listener[]>();
    const s: any = {
      auth: {},
      connected: false,
      active: false,
      on: jest.fn((event: string, fn: Listener) => {
        listeners.set(event, [...(listeners.get(event) ?? []), fn]);
        return s;
      }),
      connect: jest.fn(() => {
        s.active = true;
      }),
      disconnect: jest.fn(() => {
        s.active = false;
        s.connected = false;
      }),
      emitFromServer: (event: string, payload?: unknown) =>
        (listeners.get(event) ?? []).forEach((fn) => fn(payload)),
    };
    mockSockets.push(s);
    return s;
  }),
}));

const mockRefresh = jest.fn();
jest.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'http://localhost:3001/api',
  refreshAccessTokenNow: () => mockRefresh(),
}));

import { connectSocket, disconnectSocket } from '../socket';

beforeEach(() => {
  jest.useFakeTimers();
  disconnectSocket();
  mockSockets.length = 0;
  mockRefresh.mockReset();
});
afterEach(() => jest.useRealTimers());

/** Sunucu token'ı reddetti ve bağlantıyı kendi tarafında kesti. */
const serverRejects = (s: any) => {
  s.active = false;
  s.connected = false;
  s.emitFromServer('error', { message: 'Invalid authentication token' });
};

it('kimlik hatasında token yenilenir ve yeni token’la yeniden bağlanılır', async () => {
  mockRefresh.mockResolvedValue('fresh-token');
  const s = connectSocket('expired-token');

  serverRejects(s);
  await jest.advanceTimersByTimeAsync(1000);

  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(s.auth).toEqual({ token: 'fresh-token' });
  expect(s.connect).toHaveBeenCalled();
});

it('yenilenemezse yeniden bağlanılmaz', async () => {
  mockRefresh.mockResolvedValue(null);
  const s = connectSocket('expired-token');

  serverRejects(s);
  await jest.advanceTimersByTimeAsync(1000);

  expect(s.connect).not.toHaveBeenCalled();
});

it('kimlikle ilgisiz `error` (ör. konu yetkisi) refresh tetiklemez', async () => {
  const s: any = connectSocket('t');
  s.emitFromServer('error', { message: 'Bu konuya erişim yetkiniz yok' });
  await jest.advanceTimersByTimeAsync(1000);
  expect(mockRefresh).not.toHaveBeenCalled();
});

it('art arda denemeler sınırlıdır; sunucu kabul edince (`connected`) sayaç sıfırlanır', async () => {
  mockRefresh.mockResolvedValue('fresh');
  const s: any = connectSocket('t');

  for (let i = 0; i < 5; i += 1) {
    serverRejects(s);
    await jest.advanceTimersByTimeAsync(1000);
  }
  expect(mockRefresh).toHaveBeenCalledTimes(3);

  s.emitFromServer('connected', { userId: 'u1' });
  serverRejects(s);
  await jest.advanceTimersByTimeAsync(1000);
  expect(mockRefresh).toHaveBeenCalledTimes(4);
});

it('çıkış (disconnectSocket): socket kapanır, sonraki bağlantı yeni socket', () => {
  const s = connectSocket('t');
  disconnectSocket();
  expect(s.disconnect).toHaveBeenCalled();
  const next = connectSocket('t2');
  expect(next).not.toBe(s);
});
