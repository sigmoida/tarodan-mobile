/**
 * Detaydan beğeni: listeler invalidate EDİLMEZ (bağlı raylar / arama yeniden çekilmez); kartların
 * beğeni sayısı önbellekte yerinde ±1 yamanır.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';

let mockResult: string = 'added';
jest.mock('@/hooks/useFavoriteToggle', () => ({
  useFavoriteToggle: () => ({ favoriteIds: new Set<string>(), toggle: jest.fn(async () => mockResult) }),
}));

import { useProductFavorite } from '../_hooks/useProductFavorite';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  qc.setQueryData(qk.products.homeFeatured, [{ id: 'p1', title: 'A', price: 1, likeCount: 2 }]);
  const invalidate = jest.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useProductFavorite({ product: { id: 'p1', title: 'A' }, productId: 'p1', isAuthenticated: true }),
    { wrapper },
  );
  const likes = () => qc.getQueryData<Array<{ likeCount: number }>>(qk.products.homeFeatured)?.[0]?.likeCount;
  return { result, invalidate, likes };
}

describe('useProductFavorite — liste önbelleği', () => {
  it('eklenince listedeki kartın beğenisi +1, çıkarılınca -1; invalidate yok', async () => {
    mockResult = 'added';
    const a = setup();
    await act(async () => {
      await a.result.current.toggle();
    });
    expect(a.likes()).toBe(3);
    expect(a.invalidate).not.toHaveBeenCalled();

    mockResult = 'removed';
    const r = setup();
    await act(async () => {
      await r.result.current.toggle();
    });
    expect(r.likes()).toBe(1);
  });

  it('başarısız / misafir sonucunda dokunulmaz', async () => {
    mockResult = 'signin';
    const s = setup();
    await act(async () => {
      await s.result.current.toggle();
    });
    expect(s.likes()).toBe(2);
    expect(s.invalidate).not.toHaveBeenCalled();
  });
});
