/**
 * Parite C-1.11b · `POST /messages/threads/:id/read` API'de yok (404 yutuluyordu).
 * Okundu bilgisi `GET .../messages` ile sunucuda işlenir; thread açılırken ağ
 * isteği ATILMAZ, yalnız optimistik unread sıfırlama yapılır.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

describe('okundu işaretleme', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
  });

  it('messagesApi olmayan /read ucunu sunmaz', () => {
    expect((messagesApi as Record<string, unknown>).markAsRead).toBeUndefined();
  });

  it('useMarkAsRead hiçbir HTTP isteği atmaz', async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMarkAsRead(), { wrapper });

    act(() => {
      result.current.mutate('thread-1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
