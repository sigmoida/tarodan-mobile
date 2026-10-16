import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { BADGE_POLL_MS, useBadgePoll, invalidateBadgeCounts, __resetBadgePollForTests } from '../useBadgePoll';
import { qk, queryClient } from '@/lib/query';

function setup() {
  const refetch = jest.spyOn(queryClient, 'refetchQueries').mockResolvedValue(undefined);
  return { refetch };
}

describe('useBadgePoll', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetBadgePollForTests();
    focusManager.setFocused(true);
  });
  afterEach(() => {
    __resetBadgePollForTests();
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('birden çok odaktaki katılımcıya rağmen TEK döngü: aralık başına bir tazeleme', () => {
    const { refetch } = setup();
    renderHook(() => useBadgePoll(true));
    renderHook(() => useBadgePoll(true));
    expect(jest.getTimerCount()).toBe(1);
    act(() => { jest.advanceTimersByTime(BADGE_POLL_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch.mock.calls[0]![0]).toMatchObject({ type: 'active' });
  });

  it('odakta katılımcı yoksa yoklamaz', () => {
    const { refetch } = setup();
    renderHook(() => useBadgePoll(false));
    act(() => { jest.advanceTimersByTime(BADGE_POLL_MS * 3); });
    expect(refetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('arka planda durur; süre dolmuşsa ön plana dönüşte hemen tazeler', () => {
    const { refetch } = setup();
    renderHook(() => useBadgePoll(true));
    act(() => { focusManager.setFocused(false); });
    act(() => { jest.advanceTimersByTime(BADGE_POLL_MS * 2); });
    expect(refetch).not.toHaveBeenCalled();
    act(() => { focusManager.setFocused(true); });
    act(() => { jest.advanceTimersByTime(0); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('son katılımcı ayrılınca zamanlayıcı kalmaz', () => {
    setup();
    const { unmount } = renderHook(() => useBadgePoll(true));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('invalidateBadgeCounts yalnız rozet sorgularını geçersiz kılar', () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.notifications.unread, 1);
    qc.setQueryData(qk.offers.pendingCount, 2);
    qc.setQueryData(qk.trades.pendingCount, 3);
    qc.setQueryData(qk.notifications.list, []);
    invalidateBadgeCounts(qc);
    const inv = (k: readonly unknown[]) => qc.getQueryState(k)?.isInvalidated;
    expect(inv(qk.notifications.unread)).toBe(true);
    expect(inv(qk.offers.pendingCount)).toBe(true);
    expect(inv(qk.trades.pendingCount)).toBe(true);
    expect(inv(qk.notifications.list)).toBe(false);
  });
});
