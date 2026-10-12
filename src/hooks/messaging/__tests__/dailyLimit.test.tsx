/**
 * C-3.5 · Günlük mesaj limiti sunucudan (`GET /messages/daily-limit`).
 * Katman tablosu ve yerel sayaç yok: limit/kalan sunucu yanıtından gelir,
 * gönderim sonrası önbellekte bir düşer ve yeniden çekilir.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/lib/api/client', () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (sel?: (s: any) => unknown) => {
      const state = { isAuthenticated: true, user: { id: 'me' } };
      return sel ? sel(state) : state;
    },
    { getState: () => ({ user: { id: 'me' } }) },
  ),
}));

import { useDailyMessageLimit } from '../useDailyMessageLimit';
import { useSendMessage, useCreateThread, DailyMessageLimitError } from '../mutations';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

const MSG = {
  id: 'm1', threadId: 't1', senderId: 'me', receiverId: 'u2', content: 'selam',
  status: 'sent', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('useDailyMessageLimit', () => {
  it('GET /messages/daily-limit yanıtını kullanır (tier/yerel sayaç değil)', async () => {
    mockGet.mockResolvedValue({ data: { remaining: 4, limit: 30 } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDailyMessageLimit(), { wrapper });

    await waitFor(() => expect(result.current.limit).toBe(30));
    expect(mockGet).toHaveBeenCalledWith('/messages/daily-limit');
    expect(result.current).toMatchObject({ remaining: 4, used: 26, canSend: true, nearLimit: true });
  });

  it('hak 0 ise canSend false', async () => {
    mockGet.mockResolvedValue({ data: { remaining: 0, limit: 50 } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDailyMessageLimit(), { wrapper });

    await waitFor(() => expect(result.current.canSend).toBe(false));
  });

  it('uç hata verirse engellemez (sunucu zaten uygular)', async () => {
    mockGet.mockRejectedValue(new Error('500'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDailyMessageLimit(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.canSend).toBe(true);
    expect(result.current.limit).toBeUndefined();
  });
});

describe('gönderim ve günlük hak', () => {
  it('bugün alınmış "hak bitti" kaydı varken istek atılmaz', async () => {
    const { qc, wrapper } = setup();
    qc.setQueryData(qk.messaging.dailyLimit, { remaining: 0, limit: 50 });
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ threadId: 't1', content: 'x' })).rejects.toBeInstanceOf(
        DailyMessageLimitError,
      );
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('başarılı gönderim önbellekte hakkı bir düşürür ve sunucudan tazeler', async () => {
    mockPost.mockResolvedValue({ data: MSG });
    const { qc, wrapper } = setup();
    qc.setQueryData(qk.messaging.dailyLimit, { remaining: 9, limit: 10 });
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ threadId: 't1', content: 'selam' });
    });

    // İyimser düşüş (9 -> 8) + sunucu sayımıyla eşitlemek için tazelemeye işaretli.
    expect(qc.getQueryData<any>(qk.messaging.dailyLimit).remaining).toBe(8);
    expect(qc.getQueryState(qk.messaging.dailyLimit)?.isInvalidated).toBe(true);
  });

  it('iyimser düşüş 0 altına inmez', async () => {
    mockPost.mockResolvedValue({ data: MSG });
    const { qc, wrapper } = setup();
    qc.setQueryData(qk.messaging.dailyLimit, { remaining: 1, limit: 10 });
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ threadId: 't1', content: 'selam' });
    });

    expect(qc.getQueryData<any>(qk.messaging.dailyLimit).remaining).toBe(0);
  });

  it('boş içerikli thread oluşturma hak düşürmez', async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 't9', participant1Id: 'me', participant2Id: 'u2',
        participant1: { id: 'me', displayName: 'Ben' }, participant2: { id: 'u2', displayName: 'Ayşe' },
        unreadCount: 0, createdAt: '', updatedAt: '',
      },
    });
    const { qc, wrapper } = setup();
    qc.setQueryData(qk.messaging.dailyLimit, { remaining: 5, limit: 10 });
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ recipientId: 'u2', content: '' });
    });

    expect(qc.getQueryData<any>(qk.messaging.dailyLimit).remaining).toBe(5);
  });
});
