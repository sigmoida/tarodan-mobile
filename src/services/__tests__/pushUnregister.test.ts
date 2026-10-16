/**
 * Çıkışta push iptali: istek interceptor'sız istemciyle, çıkıştan önce okunan access token'la
 * açık Bearer taşır (token'lar yerelde zaten silinmiş; 401'i refresh/çıkış döngüsü başlatmaz).
 * Yerel push durumu (rozet, bildirim merkezi) temizlenir.
 */
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Pixel' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[abc]' })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setBadgeCountAsync: jest.fn(async () => true),
  dismissAllNotificationsAsync: jest.fn(async () => undefined),
}));
const mockNotifications = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
const mockApiPost = jest.fn(async () => ({}));
const mockGuestPost = jest.fn(async () => ({}));
jest.mock('@/lib/api', () => ({
  api: { post: (...a: unknown[]) => mockApiPost(...(a as [])) },
  guestApi: { post: (...a: unknown[]) => mockGuestPost(...(a as [])) },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

import { unregisterPushNotifications } from '../push';

beforeEach(() => jest.clearAllMocks());

it('açık Bearer ile, interceptor’sız istemciden iptal edilir; yerel durum temizlenir', async () => {
  await unregisterPushNotifications('access-1');

  expect(mockApiPost).not.toHaveBeenCalled();
  expect(mockGuestPost).toHaveBeenCalledWith(
    '/notifications/push-token',
    { token: 'ExponentPushToken[abc]', revoke: true },
    expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
  );
  expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  expect(mockNotifications.dismissAllNotificationsAsync).toHaveBeenCalled();
});

it('access token yoksa sunucuya gidilmez, yalnız yerel temizlik', async () => {
  await unregisterPushNotifications(null);
  expect(mockGuestPost).not.toHaveBeenCalled();
  expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
});
