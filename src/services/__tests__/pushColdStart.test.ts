/**
 * B9: bildirim dokunuşu EN FAZLA BİR KEZ yönlendirilir.
 * - soğuk açılışta hem canlı dinleyici hem `getLastNotificationResponseAsync` aynı yanıtı
 *   verse de tek gezinme;
 * - yönlendirilen yanıt sistemden temizlenir (`clearLastNotificationResponse`);
 * - OTA `reloadAsync` sonrası (aynı yanıt, saklı kimlik) yeniden gezinme yok.
 */
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Pixel' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'p' } } } },
}));
let responseListener: ((r: unknown) => void) | null = null;
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn((cb: (r: unknown) => void) => {
    responseListener = cb;
    return { remove: jest.fn() };
  }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponse: jest.fn(),
}));
const mockNotifications = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
jest.mock('@/lib/api', () => ({ api: { post: jest.fn() }, guestApi: { post: jest.fn() } }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), navigate: jest.fn(), dismissTo: jest.fn() },
}));
const mockStore = new Map<string, string>();
jest.mock('@/lib/storage/lazyAsyncStorage', () => ({
  readStoredValue: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  writeStoredValue: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));

import { resetPushModuleStateForTests, setupPushNotificationRouting } from '../push';

const response = (id: string) => ({
  notification: { request: { identifier: id, content: { data: { type: 'order_shipped', orderId: 'o1' } } } },
});
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  responseListener = null;
  resetPushModuleStateForTests();
});

it('canlı dinleyici + son yanıt aynı bildirimi verse de tek gezinme; yanıt temizlenir', async () => {
  mockStore.clear();
  mockNotifications.getLastNotificationResponseAsync.mockResolvedValueOnce(response('n1'));
  const teardown = setupPushNotificationRouting();
  responseListener?.(response('n1'));
  await flush();
  await flush();

  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/orders/o1');
  expect(mockNotifications.clearLastNotificationResponse).toHaveBeenCalled();
  teardown();
});

it('OTA yeniden yükleme: aynı son yanıt (saklı kimlik) yeniden gezinmez', async () => {
  mockStore.clear();
  mockStore.set('push.lastRoutedNotificationId', 'n2');
  mockNotifications.getLastNotificationResponseAsync.mockResolvedValueOnce(response('n2'));
  const teardown = setupPushNotificationRouting();
  await flush();
  await flush();

  expect(mockPush).not.toHaveBeenCalled();
  teardown();
});

it('yeni bir dokunuş yine yönlendirilir ve kimliği saklanır', async () => {
  mockStore.clear();
  const teardown = setupPushNotificationRouting();
  await flush();
  responseListener?.(response('n3'));
  await flush();

  expect(mockPush).toHaveBeenCalledWith('/orders/o1');
  expect(mockStore.get('push.lastRoutedNotificationId')).toBe('n3');
  teardown();
});
