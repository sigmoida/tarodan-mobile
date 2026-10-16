import { renderHook } from '@testing-library/react-native';
import { useSafeTimeout } from '../useSafeTimeout';

describe('useSafeTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('süre dolunca çalışır', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useSafeTimeout());
    result.current(fn, 1500);
    jest.advanceTimersByTime(1500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('unmount bekleyen zamanlayıcıyı iptal eder (gecikmeli yönlendirme ekrandan çıkınca çalışmaz)', () => {
    const fn = jest.fn();
    const { result, unmount } = renderHook(() => useSafeTimeout());
    result.current(fn, 1500);
    unmount();
    jest.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('unmount sonrası kurulmaz (ekrandan çıktıktan sonra biten mutasyon)', () => {
    const fn = jest.fn();
    const { result, unmount } = renderHook(() => useSafeTimeout());
    const schedule = result.current;
    unmount();
    expect(schedule(fn, 10)).toBeUndefined();
    jest.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
