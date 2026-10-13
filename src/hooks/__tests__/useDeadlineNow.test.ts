/**
 * A-3 inceleme #8 · Hazırlık notu son tarih geçince güncellensin: son tarih
 * anında bir kez, ayrıca uygulama ön plana dönünce "şimdi" yenilenir.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useDeadlineNow } from '../useDeadlineNow';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-13T09:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

it('son tarih geçince yeni "şimdi" döner', () => {
  const { result } = renderHook(() => useDeadlineNow('2026-10-13T09:00:05.000Z'));
  const first = result.current;
  act(() => {
    jest.advanceTimersByTime(4_000);
  });
  expect(result.current).toBe(first);
  act(() => {
    jest.advanceTimersByTime(3_000);
  });
  expect(result.current.getTime()).toBeGreaterThan(new Date('2026-10-13T09:00:05.000Z').getTime());
});

it('son tarih yoksa ya da geçmişse zamanlayıcı kurulmaz', () => {
  renderHook(() => useDeadlineNow(null));
  renderHook(() => useDeadlineNow('2026-10-13T08:00:00.000Z'));
  expect(jest.getTimerCount()).toBe(0);
});

it('uygulama ön plana dönünce yeniden hesaplanır', () => {
  const listeners: ((s: string) => void)[] = [];
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  }) as never);
  const { result } = renderHook(() => useDeadlineNow(null));
  const first = result.current;
  jest.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
  act(() => listeners.forEach((fn) => fn('active')));
  expect(result.current).not.toBe(first);
  expect(result.current.toISOString()).toBe('2026-10-13T12:00:00.000Z');
  spy.mockRestore();
});
