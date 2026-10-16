import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SOCKET_BACKGROUND_GRACE_MS, useSocketAppLifecycle } from '../useSocketAppLifecycle';

const mockSocket = {
  connected: true,
  disconnect: jest.fn(() => { mockSocket.connected = false; }),
  once: jest.fn(),
  off: jest.fn(),
};
const mockConnect = jest.fn((_t: string) => mockSocket);
jest.mock('@/services/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: (t: string) => mockConnect(t),
}));

const mockGetUnreadCount = jest.fn();
jest.mock('@/lib/api', () => ({
  messagesApi: { getUnreadCount: () => mockGetUnreadCount() },
}));

const mockAuth = { token: 'tok-1' as string | null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign((sel: (s: typeof mockAuth) => unknown) => sel(mockAuth), {
    getState: () => mockAuth,
  }),
}));

/** `exp` (sn) taşıyan imzasız test JWT'si. */
function jwt(expSec: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ exp: expSec })}.sig`;
}
const nowSec = () => Math.floor(Date.now() / 1000);

type AppStateListener = (s: string) => void;
let appStateHandler: AppStateListener = () => undefined;
const remove = jest.fn();

const goBackground = () => act(() => { appStateHandler('background'); });
const goForeground = async () => {
  await act(async () => {
    appStateHandler('active');
  });
};

describe('useSocketAppLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSocket.connected = true;
    mockAuth.token = jwt(nowSec() + 3600);
    mockGetUnreadCount.mockResolvedValue({ data: { count: 0 } });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, h) => {
      appStateHandler = h as AppStateListener;
      return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => jest.useRealTimers());

  it('arka planda bekleme süresi sonunda kapatır; dönüşte güncel token ile bağlanıp resync çalışır', async () => {
    const onResumed = jest.fn();
    renderHook(() => useSocketAppLifecycle(onResumed));

    goBackground();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS); });
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);

    const fresh = jwt(nowSec() + 7200);
    mockAuth.token = fresh;
    await goForeground();
    expect(mockConnect).toHaveBeenCalledWith(fresh);
    expect(mockSocket.once).toHaveBeenCalledWith('connect', onResumed);
    expect(mockGetUnreadCount).not.toHaveBeenCalled();
  });

  it('bekleme süresi içinde dönülürse (Android seçici / paylaşım) kopmaz, yeniden bağlanmaz', async () => {
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    goBackground();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS - 1); });
    await goForeground();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS * 2); });
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('token dolmuşsa önce yenileme yolu çalışır, yenilenen token ile bağlanır', async () => {
    mockAuth.token = jwt(nowSec() - 10);
    const renewed = jwt(nowSec() + 3600);
    mockGetUnreadCount.mockImplementation(async () => {
      mockAuth.token = renewed; // interceptor refresh → store'a yazar
      return { data: { count: 0 } };
    });
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    goBackground();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS); });
    await goForeground();
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith(renewed);
  });

  it('yenileme geçici hatayla düşerse (token hâlâ dolmuş) bağlanmaz', async () => {
    mockAuth.token = jwt(nowSec() - 10);
    mockGetUnreadCount.mockRejectedValue(new Error('ağ'));
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    goBackground();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS); });
    await goForeground();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('iOS inactive sıçraması soketi kapatmaz / yeniden bağlamaz', async () => {
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    act(() => { appStateHandler('inactive'); });
    await goForeground();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS * 2); });
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('oturum yokken AppState dinlenmez', () => {
    mockAuth.token = null;
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('unmount dinleyiciyi ve bekleyen kopma zamanlayıcısını kaldırır', () => {
    const { unmount } = renderHook(() => useSocketAppLifecycle(jest.fn()));
    goBackground();
    unmount();
    expect(remove).toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(SOCKET_BACKGROUND_GRACE_MS); });
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
