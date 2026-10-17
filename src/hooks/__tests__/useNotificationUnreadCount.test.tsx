/**
 * Okunmamış bildirim sayısı: ana sayfa rozetleri ve marka barı TEK hook'u paylaşır
 * (tek önbellek girdisi, tek ağ isteği).
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  notificationsApi: { getUnreadCount: jest.fn() },
}));

import { notificationsApi } from '@/lib/api';
import { useNotificationUnreadCount } from '../useNotificationUnreadCount';

const getUnreadCount = notificationsApi.getUnreadCount as unknown as jest.Mock;

const wrapper = (client: QueryClient) => ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useNotificationUnreadCount', () => {
  beforeEach(() => getUnreadCount.mockReset());

  it('iki tüketici tek istek atar ve aynı sayıyı görür', async () => {
    getUnreadCount.mockResolvedValue({ data: { count: 4 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => [useNotificationUnreadCount(true), useNotificationUnreadCount(true)] as const,
      { wrapper: wrapper(client) },
    );
    await waitFor(() => expect(result.current).toEqual([4, 4]));
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('{data:{count}} gövdesi okunur; hata → 0; misafir (enabled=false) → istek yok, 0', async () => {
    getUnreadCount.mockResolvedValue({ data: { data: { count: 2 } } });
    let client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const a = renderHook(() => useNotificationUnreadCount(true), { wrapper: wrapper(client) });
    await waitFor(() => expect(a.result.current).toBe(2));

    getUnreadCount.mockReset();
    getUnreadCount.mockRejectedValue(new Error('x'));
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const b = renderHook(() => useNotificationUnreadCount(true), { wrapper: wrapper(client) });
    await waitFor(() => expect(getUnreadCount).toHaveBeenCalled());
    expect(b.result.current).toBe(0);

    getUnreadCount.mockReset();
    client = new QueryClient();
    const c = renderHook(() => useNotificationUnreadCount(false), { wrapper: wrapper(client) });
    expect(c.result.current).toBe(0);
    expect(getUnreadCount).not.toHaveBeenCalled();
  });
});
