/**
 * Parite C-1.11b · `POST /messages/threads/:id/read` API'de yok (404 yutuluyordu).
 * Okundu bilgisini sunucu `GET .../messages` sırasında işler. Global staleTime
 * 5 dk olduğundan, thread kısa sürede yeniden açılınca GET atılmazsa sunucuda
 * okunmamış kalır ve rozet geri gelir → okundu işareti sorguyu invalidate eder.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('@/lib/api/client', () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { messagesApi } from '@/lib/api/messaging';
import { useMarkAsRead } from '@/hooks/messaging/mutations';
import { useMessagesQuery } from '@/hooks/messaging/queries';

const THREAD = 't1';

function setup() {
  // Üretimdeki gibi 5 dk staleTime: önbellekteki mesajlar taze sayılır.
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('okundu işaretleme', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { messages: [] } });
  });

  it('messagesApi olmayan /read ucunu sunmaz', () => {
    expect((messagesApi as Record<string, unknown>).markAsRead).toBeUndefined();
  });

  it('thread açılınca POST atılmaz, yerel unread sıfırlanır', () => {
    const { qc, wrapper } = setup();
    qc.setQueryData(qk.messaging.threads, [{ id: THREAD, unreadCount: 3 }]);
    qc.setQueryData(qk.messaging.unreadCount, 5);
    const { result } = renderHook(() => useMarkAsRead(), { wrapper });

    result.current(THREAD);

    expect(mockPost).not.toHaveBeenCalled();
    expect((qc.getQueryData(qk.messaging.threads) as any[])[0].unreadCount).toBe(0);
    expect(qc.getQueryData(qk.messaging.unreadCount)).toBe(2);
  });

  it('5 dk içinde yeniden açılan thread (taze önbellek) yine de GET tetikler', async () => {
    const { qc, wrapper } = setup();
    // Thread daha önce açıldı: mesajlar önbellekte ve taze.
    qc.setQueryData(qk.messaging.messages(THREAD), []);
    const { result } = renderHook(
      () => ({ q: useMessagesQuery(THREAD), markRead: useMarkAsRead() }),
      { wrapper },
    );
    // Taze önbellek → mount'ta GET yok.
    expect(mockGet).not.toHaveBeenCalled();

    result.current.markRead(THREAD);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(mockGet.mock.calls[0]![0]).toBe(`/messages/threads/${THREAD}/messages`);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('ilk açılışta uçuştaki GET iptal edilip tekrarlanmaz', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ q: useMessagesQuery(THREAD), markRead: useMarkAsRead() }),
      { wrapper },
    );
    result.current.markRead(THREAD); // mount fetch'i sürerken
    await waitFor(() => expect(result.current.q.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
