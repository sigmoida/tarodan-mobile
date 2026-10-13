import { act, renderHook } from '@testing-library/react-native';
import { useBrandFontSession } from '../useBrandFontSession';

describe('useBrandFontSession', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('süre dolmadan font yüklenirse marka fontu açık, splash bırakılır', () => {
    const { result, rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) => useBrandFontSession(loaded, null, 4000),
      { initialProps: { loaded: false } },
    );
    expect(result.current).toEqual({ settled: false, enabled: false });
    rerender({ loaded: true });
    expect(result.current).toEqual({ settled: true, enabled: true });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.enabled).toBe(true);
  });

  it('süre aşıldıysa oturum sistem fontunda kalır; font sonradan yüklense bile geçilmez', () => {
    const { result, rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) => useBrandFontSession(loaded, null, 4000),
      { initialProps: { loaded: false } },
    );
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current).toEqual({ settled: true, enabled: false });
    rerender({ loaded: true });
    expect(result.current).toEqual({ settled: true, enabled: false });
  });

  it('hata → splash bırakılır, sistem fontu', () => {
    const { result } = renderHook(() => useBrandFontSession(false, new Error('x'), 4000));
    expect(result.current).toEqual({ settled: true, enabled: false });
  });
});
