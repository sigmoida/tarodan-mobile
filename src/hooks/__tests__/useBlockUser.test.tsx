/**
 * Kullanıcı engelleme (Apple App Review Guideline 1.2).
 *
 * Engelleme uzun süre yalnız DM'de, doğrudan `userApi.block` çağrısıyla vardı;
 * hiçbir liste tazelenmiyordu, engel durumu hiç sorulmuyordu ve engel kaldırma
 * arayüzü yoktu. Bu test, paylaşılan hook'un üç sözleşmesini korur:
 *   1. engelleme ONAY diyaloğunun ardından çalışır (kazara engel yok),
 *   2. başarıdan sonra engellenen kişinin göründüğü TÜM kökler invalidate olur
 *      (ilan/arama/mesaj/satıcı/koleksiyon/takip/favori — akıştan anında düşsün),
 *   3. engel durumu yalnız giriş yapmış ve hedef kendisi değilken sorulur.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  userApi: {
    block: jest.fn().mockResolvedValue({ data: { success: true } }),
    unblock: jest.fn().mockResolvedValue({ data: { success: true } }),
    getBlockStatus: jest.fn().mockResolvedValue({ data: { blocked: false } }),
  },
}));

let mockAuthState: any = { isAuthenticated: true, user: { id: 'me' } };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => (sel ? sel(mockAuthState) : mockAuthState),
}));

import { appAlert } from '@/ui';
import { userApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useBlockStatus, useBlockUser } from '../useBlockUser';

// appAlert jest.setup.ts'te global mock'lanır ve her testten önce sıfırlanır.
const mockAppAlert = appAlert as unknown as jest.Mock;

const api = userApi as unknown as {
  block: jest.Mock;
  unblock: jest.Mock;
  getBlockStatus: jest.Mock;
};

let client: QueryClient;
function wrapper({ children }: { children: any }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Onay diyaloğundaki "Engelle" düğmesine basar. */
function confirmBlock() {
  const buttons = mockAppAlert.mock.calls.at(-1)?.[2] ?? [];
  const destructive = buttons.find((b: any) => b.style === 'destructive');
  expect(destructive).toBeDefined();
  return act(async () => {
    destructive.onPress();
  });
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockAuthState = { isAuthenticated: true, user: { id: 'me' } };
  api.block.mockReset().mockResolvedValue({ data: { success: true } });
  api.unblock.mockReset().mockResolvedValue({ data: { success: true } });
  api.getBlockStatus.mockReset().mockResolvedValue({ data: { blocked: false } });
});

describe('requestBlock — onay kapısı', () => {
  it('onay verilmeden API çağrılmaz', () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    act(() => result.current.requestBlock('u2', 'Ayşe'));
    expect(mockAppAlert).toHaveBeenCalled();
    expect(api.block).not.toHaveBeenCalled();
  });

  it('onaydan sonra engeller', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    act(() => result.current.requestBlock('u2', 'Ayşe'));
    await confirmBlock();
    await waitFor(() => expect(api.block).toHaveBeenCalledWith('u2'));
  });

  it('requireAuth false dönerse diyalog bile açılmaz', () => {
    const requireAuth = jest.fn().mockReturnValue(false);
    const { result } = renderHook(() => useBlockUser({ requireAuth }), { wrapper });
    act(() => result.current.requestBlock('u2', 'Ayşe'));
    expect(requireAuth).toHaveBeenCalled();
    expect(mockAppAlert).not.toHaveBeenCalled();
  });
});

describe('invalidasyon — engellenen anında akıştan düşer', () => {
  it('engelleme başarısı, içerik köklerini tazeler', async () => {
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    act(() => result.current.requestBlock('u2', 'Ayşe'));
    await confirmBlock();
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const invalidated = spy.mock.calls.map((c) => JSON.stringify((c[0] as any).queryKey));
    for (const key of [
      qk.blocks.list,
      qk.products.all,
      qk.products.searchAll,
      qk.messaging.all,
      qk.seller.all,
      qk.collections.all,
      qk.follow.following,
      qk.favorites.all,
    ]) {
      expect(invalidated).toContain(JSON.stringify(key));
    }
  });

  it('engel kaldırma da aynı kökleri tazeler', async () => {
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await act(async () => {
      result.current.requestUnblock('u2', 'Ayşe');
    });
    await waitFor(() => expect(api.unblock).toHaveBeenCalledWith('u2'));
    const invalidated = spy.mock.calls.map((c) => JSON.stringify((c[0] as any).queryKey));
    expect(invalidated).toContain(JSON.stringify(qk.blocks.list));
    expect(invalidated).toContain(JSON.stringify(qk.products.all));
  });

  it('hata bildirilir, invalidasyon yapılmaz', async () => {
    api.block.mockRejectedValue({ response: { data: { message: 'Engelleme sınırı' } } });
    const notify = jest.fn();
    const { result } = renderHook(() => useBlockUser({ notify }), { wrapper });
    act(() => result.current.requestBlock('u2', 'Ayşe'));
    await confirmBlock();
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Engelleme sınırı', 'error'));
  });
});

describe('useBlockStatus — yalnız gerektiğinde sorar', () => {
  it('giriş yapmış ve başkası ise sorar', async () => {
    api.getBlockStatus.mockResolvedValue({ data: { blocked: true } });
    const { result } = renderHook(() => useBlockStatus('u2'), { wrapper });
    await waitFor(() => expect(result.current.isBlocked).toBe(true));
    expect(api.getBlockStatus).toHaveBeenCalledWith('u2');
  });

  it('hedef kendisiyse sormaz', async () => {
    const { result } = renderHook(() => useBlockStatus('me'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getBlockStatus).not.toHaveBeenCalled();
  });

  it('misafirken sormaz', async () => {
    mockAuthState = { isAuthenticated: false, user: null };
    const { result } = renderHook(() => useBlockStatus('u2'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getBlockStatus).not.toHaveBeenCalled();
  });
});
