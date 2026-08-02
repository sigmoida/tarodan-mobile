/**
 * Koordinatörün canlı ölçtüğü tuzak: `GET /auth/username-availability` FORMAT
 * doğrulaması yapmaz (`Gorkem` gibi büyük harfli girdi için bile `available:true`
 * dönebilir) — istemci kendi regex'ini önce zorlamalı, sorguyu ancak o geçince
 * atmalı. Debounce 400ms.
 */
import React, { useState } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  authApi: { checkUsernameAvailability: jest.fn() },
}));
import { authApi } from '@/lib/api';
import { useUsernameAvailability } from '../_hooks/useUsernameAvailability';

const mockCheck = authApi.checkUsernameAvailability as jest.Mock;

// `useState(() => …)`: gövdede `new QueryClient()` her render'da yeni bir client
// üretip cache'i sıfırlıyordu. Client render başına bir kez kurulur, ama her
// `renderHook` kendi client'ını alır (testler arası cache sızmaz).
//
// ⚠️ Burada BİLEREK `retry: false` verilmiyor: hook'un kendi `retry: false`
// ayarını (429'da sessizce yeniden denememesi) gerçekten test edebilmek için
// wrapper prod varsayılanlarını (`src/lib/query/client.ts` → `retry: 2`) taklit
// etmeli. Wrapper retry'ı kapatırsa 429 testi hook'tan bağımsız yeşil kalırdı.
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(() => new QueryClient());
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
      wrapper: Wrapper,
      initialProps: { v: 'Gorkem' },
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('kısa girişte (2 karakter) sorgu atılmaz', async () => {
    const { rerender } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper: Wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'ab' });

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('geçerli küçük harfli girişi tam 400ms debounce\'tan önce sorgulamaz', async () => {
    const { rerender } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper: Wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'gorkem.test' });

    await jest.advanceTimersByTimeAsync(399);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('geçerli küçük harfli girişi 400ms debounce sonrası sorgular ve available:true yansıtır', async () => {
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper: Wrapper,
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
      wrapper: Wrapper,
      initialProps: { v: '' },
    });
    rerender({ v: 'alinmis.ad' });

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(result.current.available).toBe(false));
  });

  it('girdi değişince önceki adın available:false sonucunu TAŞIMAZ (bayat sonuç)', async () => {
    mockCheck.mockImplementation((u: string) =>
      Promise.resolve({ data: { available: u !== 'alinmis.ad' } }),
    );
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper: Wrapper,
      initialProps: { v: '' },
    });

    rerender({ v: 'alinmis.ad' });
    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(result.current.available).toBe(false));

    // Kullanıcı bambaşka (geçerli) bir ada geçti — debounce henüz dolmadı.
    // Eski adın "alınmış" sonucu yeni ada YAPIŞMAMALI; durum "kontrol ediliyor".
    rerender({ v: 'yeni.ad' });
    expect(result.current.available).toBeUndefined();
    expect(result.current.checking).toBe(true);

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it('429 (throttle) yanıtında isThrottled true olur ve sessizce yeniden denemez', async () => {
    mockCheck.mockRejectedValue({ response: { status: 429 } });
    const { rerender, result } = renderHook(({ v }: { v: string }) => useUsernameAvailability(v), {
      wrapper: Wrapper,
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
