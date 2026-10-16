import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useSocketAppLifecycle } from '../useSocketAppLifecycle';

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

const mockAuth = { token: 'tok-1' as string | null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign((sel: (s: typeof mockAuth) => unknown) => sel(mockAuth), {
    getState: () => mockAuth,
  }),
}));

type AppStateListener = (s: string) => void;
let appStateHandler: AppStateListener = () => undefined;
const remove = jest.fn();

describe('useSocketAppLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = true;
    mockAuth.token = 'tok-1';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, h) => {
      appStateHandler = h as AppStateListener;
      return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  it('arka planda soketi kapatır, ön plana dönüşte güncel token ile bağlanır ve resync çalışır', () => {
    const onResumed = jest.fn();
    renderHook(() => useSocketAppLifecycle(onResumed));

    appStateHandler('background');
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);

    mockAuth.token = 'tok-2';
    appStateHandler('active');
    expect(mockConnect).toHaveBeenCalledWith('tok-2');
    expect(mockSocket.once).toHaveBeenCalledWith('connect', onResumed);
  });

  it('iOS inactive sıçraması soketi kapatmaz / yeniden bağlamaz', () => {
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    appStateHandler('inactive');
    appStateHandler('active');
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('oturum yokken AppState dinlenmez', () => {
    mockAuth.token = null;
    renderHook(() => useSocketAppLifecycle(jest.fn()));
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('unmount dinleyiciyi kaldırır', () => {
    const { unmount } = renderHook(() => useSocketAppLifecycle(jest.fn()));
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
