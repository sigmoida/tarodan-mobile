import { act, renderHook } from '@testing-library/react-native';
import { theme, useDelayedLoading } from '@/ui';

describe('useDelayedLoading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = (initial: boolean, opts?: { delay?: number; minDuration?: number }) =>
    renderHook(({ loading }: { loading: boolean }) => useDelayedLoading(loading, opts), {
      initialProps: { loading: initial },
    });

  it('varsayılanlar token’dan: delayMs dolmadan göstermez, dolunca gösterir', () => {
    const { result } = setup(true);
    expect(result.current).toBe(false);
    act(() => {
      jest.advanceTimersByTime(theme.loading.delayMs - 1);
    });
    expect(result.current).toBe(false);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('gecikmeden kısa yükleme hiç gösterilmez', () => {
    const { result, rerender } = setup(true, { delay: 100 });
    act(() => {
      jest.advanceTimersByTime(80);
    });
    rerender({ loading: false });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it('gösterildiyse en az minDuration kalır', () => {
    const { result, rerender } = setup(true, { delay: 100, minDuration: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    rerender({ loading: false });
    expect(result.current).toBe(true);
    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(result.current).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('asgari süre zaten dolduysa hemen kapanır', () => {
    const { result, rerender } = setup(true, { delay: 100, minDuration: 300 });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it('asgari süre içinde yeniden yüklenirse gösterge kesintisiz kalır', () => {
    const { result, rerender } = setup(true, { delay: 100, minDuration: 300 });
    act(() => {
      jest.advanceTimersByTime(120);
    });
    rerender({ loading: false });
    rerender({ loading: true });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });

  it('delay: 0 → ilk render’da gösterir (testler / bilinçli anlık iskelet)', () => {
    const { result } = setup(true, { delay: 0 });
    expect(result.current).toBe(true);
  });
});
