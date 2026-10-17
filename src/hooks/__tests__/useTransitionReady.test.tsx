import { act, renderHook } from '@testing-library/react-native';
import { TRANSITION_READY_FALLBACK_MS, useTransitionReady } from '../useTransitionReady';
import { navigationMock } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

type Handler = (e: { data?: { closing?: boolean } }) => void;

describe('useTransitionReady — ağır işi açılış geçişinden sonraya bırakır', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    navigationMock.addListener.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const lastHandler = (): Handler => {
    const calls = navigationMock.addListener.mock.calls as unknown as Array<[string, Handler]>;
    const call = calls.filter(([name]) => name === 'transitionEnd').pop();
    if (!call) throw new Error('transitionEnd dinlenmiyor');
    return call[1];
  };

  it('açılış transitionEnd gelince hazır; kapanış olayı saymaz', () => {
    const { result } = renderHook(() => useTransitionReady());
    expect(result.current).toBe(false);
    act(() => lastHandler()({ data: { closing: true } }));
    expect(result.current).toBe(false);
    act(() => lastHandler()({ data: { closing: false } }));
    expect(result.current).toBe(true);
  });

  it('olay hiç gelmezse emniyet zamanlayıcısıyla hazır olur', () => {
    const { result } = renderHook(() => useTransitionReady());
    act(() => jest.advanceTimersByTime(TRANSITION_READY_FALLBACK_MS - 1));
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });
});
