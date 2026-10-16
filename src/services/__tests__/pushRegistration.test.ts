/**
 * Push kaydı (B8/B11/P2/P8):
 * - açılışta/girişte izin İSTENMEZ (yalnız verilmişse kaydedilir); `prompt` ile istenir;
 * - Android kanalları izin diyaloğundan ve token'dan ÖNCE oluşturulur;
 * - `deviceId` kurulum kimliği, `deviceModel` ayrı alan;
 * - sunucu reddederse sonuç `failed` + Sentry uyarısı (eskiden sessizce yutuluyordu);
 * - kayıt, bekleyen çıkış iptalini bekler.
 */
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Pixel 8' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
const calls: string[] = [];
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
  getPermissionsAsync: jest.fn(async () => {
    calls.push('getPermissions');
    return { status: 'undetermined', canAskAgain: true, granted: false };
  }),
  requestPermissionsAsync: jest.fn(async () => {
    calls.push('requestPermissions');
    return { status: 'granted', granted: true, canAskAgain: false };
  }),
  getExpoPushTokenAsync: jest.fn(async () => {
    calls.push('getToken');
    return { data: 'ExponentPushToken[abc]' };
  }),
  setNotificationChannelAsync: jest.fn(async (id: string) => {
    calls.push(`channel:${id}`);
  }),
  addPushTokenListener: jest.fn((cb: (e: { data: string }) => void) => {
    mockTokenEvents.cb = cb;
    return { remove: jest.fn() };
  }),
}));
const mockTokenEvents: { cb: ((e: { data: string }) => void) | null } = { cb: null };
const mockNotifications = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
const mockApiPost = jest.fn(async (..._a: unknown[]) => ({}));
jest.mock('@/lib/api', () => ({
  api: { post: (...a: unknown[]) => mockApiPost(...a) },
  guestApi: { post: jest.fn() },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
const mockCaptureMessage = jest.fn();
jest.mock('@/services/sentry', () => ({
  captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
}));
jest.mock('@/lib/device/installId', () => ({ getInstallId: jest.fn(async () => 'install-123') }));
const mockSettle = jest.fn(async () => {
  calls.push('settleRevoke');
});
jest.mock('../pushRevocation', () => ({ settlePendingPushRevoke: () => mockSettle() }));
let mockAuthed = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ isAuthenticated: mockAuthed }) },
}));
let mockEpoch = 1;
jest.mock('@/lib/api/sessionState', () => ({ getSessionEpoch: () => mockEpoch }));

import { Platform } from 'react-native';
import {
  addPushTokenChangeListener,
  resetPushModuleStateForTests,
  syncPushRegistration,
  trackOwnTokenFetch,
} from '../push';
import { resetNotificationPermissionModuleForTests } from '@/lib/permissions/notifications';

// Kanal sırası Android'e özgü: platform bu dosyada Android.
const originalOS = Platform.OS;
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
});
afterAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthed = true;
  mockEpoch = 1;
  calls.length = 0;
  resetPushModuleStateForTests();
  resetNotificationPermissionModuleForTests();
});

it('varsayılan: izin sorulmamışsa İSTENMEZ, token alınmaz', async () => {
  await expect(syncPushRegistration()).resolves.toBe('no-permission');
  expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(mockApiPost).not.toHaveBeenCalled();
});

it('prompt: kanallar izin diyaloğundan ÖNCE; sonra token ve kayıt (kurulum kimliği + model)', async () => {
  await expect(syncPushRegistration({ prompt: true })).resolves.toBe('registered');

  const firstRequest = calls.indexOf('requestPermissions');
  const channelCalls = calls.filter((c) => c.startsWith('channel:'));
  expect(channelCalls).toEqual(['channel:default', 'channel:trades', 'channel:messages', 'channel:orders']);
  expect(calls.indexOf('channel:orders')).toBeLessThan(firstRequest);
  expect(calls.indexOf('getToken')).toBeGreaterThan(firstRequest);
  // Bekleyen çıkış iptali kayıttan önce sonuçlanır.
  expect(mockSettle).toHaveBeenCalled();
  expect(mockApiPost).toHaveBeenCalledWith('/notifications/push-token', {
    token: 'ExponentPushToken[abc]',
    platform: 'android',
    deviceId: 'install-123',
    deviceModel: 'Pixel 8',
  });
});

it('izin verilmişse sessizce kaydeder (diyalog yok)', async () => {
  mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted', granted: true });
  await expect(syncPushRegistration()).resolves.toBe('registered');
  expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
});

it('sunucu reddederse `failed` + Sentry uyarısı (yutulmaz)', async () => {
  mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted', granted: true });
  mockApiPost.mockRejectedValueOnce({ response: { status: 400 } });

  await expect(syncPushRegistration()).resolves.toBe('failed');
  expect(mockCaptureMessage).toHaveBeenCalledWith(expect.stringContaining('(400)'), 'warning');
});

describe('oturum değişimi ve token olayları', () => {
  const granted = () =>
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted', granted: true });

  it('bekleyen iptal sürerken çıkış yapıldıysa token YAZILMAZ (cancelled)', async () => {
    granted();
    mockSettle.mockImplementationOnce(async () => {
      mockAuthed = false;
    });
    await expect(syncPushRegistration()).resolves.toBe('cancelled');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('oturum kuşağı değiştiyse (hesap değişti) yazılmaz', async () => {
    granted();
    mockSettle.mockImplementationOnce(async () => {
      mockEpoch = 2;
    });
    await expect(syncPushRegistration()).resolves.toBe('cancelled');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('çağıranın isCurrent denetimi false ise yazılmaz', async () => {
    granted();
    await expect(syncPushRegistration({ isCurrent: () => false })).resolves.toBe('cancelled');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('onlyIfChanged: son yazılan token aynıysa tekrar yazılmaz', async () => {
    granted();
    await syncPushRegistration();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    granted();
    await expect(syncPushRegistration({ onlyIfChanged: true })).resolves.toBe('registered');
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it('kendi token alımımızın tetiklediği olay dinleyiciyi çağırmaz; gerçek değişiklik çağırır', async () => {
    jest.useFakeTimers();
    try {
      const listener = jest.fn();
      const remove = addPushTokenChangeListener(listener);
      // Kendi alımımız sırasında gelen olay (getExpoPushTokenAsync → cihaz token'ı).
      await trackOwnTokenFetch(async () => {
        mockTokenEvents.cb?.({ data: 'device-1' });
      });
      expect(listener).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2000);
      // Aynı cihaz token'ı tekrar: değişiklik değil.
      mockTokenEvents.cb?.({ data: 'device-1' });
      expect(listener).not.toHaveBeenCalled();
      // Gerçek yenilenme.
      mockTokenEvents.cb?.({ data: 'device-2' });
      expect(listener).toHaveBeenCalledTimes(1);
      remove();
    } finally {
      jest.useRealTimers();
    }
  });
});

it('iOS gibi tekrar sorulamayan red: prompt olsa da diyalog açılmaz', async () => {
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    status: 'denied',
    granted: false,
    canAskAgain: false,
  });
  await expect(syncPushRegistration({ prompt: true })).resolves.toBe('no-permission');
  expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
