/**
 * B8: kayıt başarısızsa geri çekilmeli yeniden denenir, ön plana dönüşte de denenir; APNs/FCM
 * token'ı yenilenince yeni token yazılır. Oturum kapanınca zamanlayıcı/aboneler temizlenir.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockSync = jest.fn();
let tokenListener: (() => void) | null = null;
jest.mock('@/services/push', () => ({
  syncPushRegistration: (...a: unknown[]) => mockSync(...a),
  addPushTokenChangeListener: (cb: () => void) => {
    tokenListener = cb;
    return () => {
      tokenListener = null;
    };
  },
}));

import { PUSH_REGISTER_RETRY_DELAYS_MS, usePushRegistration } from '../usePushRegistration';

let appStateHandler: ((s: string) => void) | null = null;
beforeEach(() => {
  jest.useFakeTimers();
  mockSync.mockReset();
  tokenListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: (s: string) => void) => {
    appStateHandler = h;
    return { remove: jest.fn() };
  }) as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('oturum yokken hiçbir şey yapmaz', () => {
  renderHook(() => usePushRegistration(false));
  expect(mockSync).not.toHaveBeenCalled();
});

it('girişte izin İSTEMEDEN kaydeder', async () => {
  mockSync.mockResolvedValue('registered');
  renderHook(() => usePushRegistration(true));
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockSync).toHaveBeenCalledWith();
});

it('başarısız kayıt geri çekilmeyle yeniden denenir', async () => {
  mockSync.mockResolvedValueOnce('failed').mockResolvedValueOnce('failed').mockResolvedValue('registered');
  renderHook(() => usePushRegistration(true));
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockSync).toHaveBeenCalledTimes(1);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(PUSH_REGISTER_RETRY_DELAYS_MS[0]);
  });
  expect(mockSync).toHaveBeenCalledTimes(2);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(PUSH_REGISTER_RETRY_DELAYS_MS[1]);
  });
  expect(mockSync).toHaveBeenCalledTimes(3);
});

it('ön plana dönüşte: son kayıt başarılı değilse (izin Ayarlar\'dan açıldı) yeniden dener', async () => {
  mockSync.mockResolvedValueOnce('no-permission').mockResolvedValue('registered');
  renderHook(() => usePushRegistration(true));
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    appStateHandler?.('active');
  });
  expect(mockSync).toHaveBeenCalledTimes(2);
  // Kayıtlıyken ön plan yeni istek atmaz.
  await act(async () => {
    appStateHandler?.('active');
  });
  expect(mockSync).toHaveBeenCalledTimes(2);
});

it('token yenilenince yeniden kaydeder; çıkışta abonelik kalkar', async () => {
  mockSync.mockResolvedValue('registered');
  const { rerender } = renderHook(({ authed }: { authed: boolean }) => usePushRegistration(authed), {
    initialProps: { authed: true },
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    tokenListener?.();
  });
  expect(mockSync).toHaveBeenCalledTimes(2);

  rerender({ authed: false });
  expect(tokenListener).toBeNull();
});
