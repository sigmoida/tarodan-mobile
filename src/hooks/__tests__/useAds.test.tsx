/**
 * useAds — metin reklam elenmez; reklamsızlık: sunucu boolean verirse ona uy,
 * vermezse authStore'daki sabit tablo (bugünkü davranış).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetActive = jest.fn();
jest.mock('@/lib/api', () => ({
  adsApi: { getActive: (...a: unknown[]) => mockGetActive(...(a as [])) },
}));

let mockLimits: { isAdFree?: boolean } | null = null;
jest.mock('../useMembershipLimits', () => ({
  useMembershipLimits: () => ({ limits: mockLimits, isLoading: false }),
}));

import { useAds } from '../useAds';

const ad = (over: Record<string, unknown> = {}) => ({
  id: 'a', title: 'T', imageUrl: 'https://x/a.png', linkUrl: null, content: null, altText: null,
  width: null, height: null, position: 'header', deviceType: 'all', ...over,
});

function run(position = 'header') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAds(position), { wrapper });
}

describe('useAds', () => {
  beforeEach(() => {
    mockGetActive.mockReset();
    mockLimits = null;
  });

  it('görselsiz (metin) reklamı eler MEZ; başlıksız+görselsiz çizilemez olduğundan elenir', async () => {
    mockGetActive.mockResolvedValue({
      data: [
        ad({ id: 'img' }),
        ad({ id: 'text', imageUrl: null }),
        ad({ id: 'empty', imageUrl: '', title: '' }),
      ],
    });
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ads.map((a) => a.id)).toEqual(['img', 'text']);
  });

  it('konum ve cihaz filtresi sürer', async () => {
    mockGetActive.mockResolvedValue({
      data: [ad({ id: 'ok' }), ad({ id: 'other', position: 'footer' }), ad({ id: 'desk', deviceType: 'desktop' })],
    });
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ads.map((a) => a.id)).toEqual(['ok']);
  });

  it('sunucu isAdFree:true derse uç çağrılmaz', () => {
    mockLimits = { isAdFree: true };
    const { result } = run();
    expect(result.current.isAdFree).toBe(true);
    expect(mockGetActive).not.toHaveBeenCalled();
  });

  it('isAdFree:false (admin kapattı) → reklam gösterilir', async () => {
    mockLimits = { isAdFree: false };
    mockGetActive.mockResolvedValue({ data: [ad()] });
    const { result } = run();
    await waitFor(() => expect(result.current.ads).toHaveLength(1));
    expect(result.current.isAdFree).toBe(false);
  });

  it('limits yoksa (misafir) reklamsız sayılmaz', async () => {
    mockGetActive.mockResolvedValue({ data: [ad()] });
    const { result } = run();
    await waitFor(() => expect(result.current.ads).toHaveLength(1));
    expect(result.current.isAdFree).toBe(false);
  });
});
