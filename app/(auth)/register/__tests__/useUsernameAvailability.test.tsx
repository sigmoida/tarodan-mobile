/**
 * Koordinatörün canlı ölçtüğü tuzak: `GET /auth/username-availability` FORMAT
 * doğrulaması yapmaz (`Gorkem` gibi büyük harfli girdi için bile `available:true`
 * dönebilir) — istemci kendi regex'ini önce zorlamalı, sorguyu ancak o geçince
 * atmalı. Debounce 400ms.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  authApi: { checkUsernameAvailability: jest.fn() },
}));
import { authApi } from '@/lib/api';
import { useUsernameAvailability } from '../_hooks/useUsernameAvailability';

const mockCheck = authApi.checkUsernameAvailability as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockCheck.mockResolvedValue({ data: { available: true } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useUsernameAvailability', () => {
  it('⚠️ büyük harfli girişi debounce dolsa bile hiç sorgulamaz (uç format doğrulamıyor)', async () => {
    renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: 'Gorkem' },
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('kısa girişte (2 karakter) sorgu atılmaz', async () => {
    const { rerender } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'ab' });

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('geçerli küçük harfli girişi tam 400ms debounce\'tan önce sorgulamaz', async () => {
    const { rerender } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'gorkem.test' });

    await jest.advanceTimersByTimeAsync(399);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('geçerli küçük harfli girişi 400ms debounce sonrası sorgular ve available:true yansıtır', async () => {
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'gorkem.test' });

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(mockCheck).toHaveBeenCalledWith('gorkem.test'));
    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it('available:false yanıtını yansıtır', async () => {
    mockCheck.mockResolvedValue({ data: { available: false } });
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'alinmis.ad' });

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(result.current.available).toBe(false));
  });

  it('429 (throttle) yanıtında isThrottled true olur ve sessizce yeniden denemez', async () => {
    mockCheck.mockRejectedValue({ response: { status: 429 } });
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'gorkem.test' });

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(result.current.isThrottled).toBe(true));

    const callsSoFar = mockCheck.mock.calls.length;
    await jest.advanceTimersByTimeAsync(10_000);
    expect(mockCheck.mock.calls.length).toBe(callsSoFar);
  });
});
