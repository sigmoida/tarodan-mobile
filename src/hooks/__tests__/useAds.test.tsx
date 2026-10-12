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

jest.mock('../useMembershipLimits', () => ({
  useMembershipLimits: () => ({ limits: null, isLoading: false }),
}));

import { useAds } from '../useAds';
import { useAuthStore } from '@/stores/authStore';

const setServerLimits = (v: { isAdFree?: boolean } | null) =>
  useAuthStore.setState({ serverLimits: v as any, user: { membershipTier: 'premium' } as any });

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
    setServerLimits(null);
  });

  it('görselsiz (metin) reklamı eler MEZ; başlıksız+görselsiz çizilemez olduğundan elenir', async () => {
    mockGetActive.mockResolvedValue({
      data: [
        ad({ id: 'img' }),
        ad({ id: 'text', imageUrl: null }),
        ad({ id: 'empty', imageUrl: '', title: '' }),
        ad({ id: 'blank', imageUrl: '   ', title: '  ' }),
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
    setServerLimits({ isAdFree: true });
    const { result } = run();
    expect(result.current.isAdFree).toBe(true);
    expect(mockGetActive).not.toHaveBeenCalled();
  });

  it('isAdFree:false (admin kapattı) → reklam gösterilir', async () => {
    setServerLimits({ isAdFree: false });
    mockGetActive.mockResolvedValue({ data: [ad()] });
    const { result } = run();
    await waitFor(() => expect(result.current.ads).toHaveLength(1));
    expect(result.current.isAdFree).toBe(false);
  });

  it('premium üye + sunucu bir şey söylemedi (serverLimits yok / isAdFree eksik) → reklam gösterilir', async () => {
    setServerLimits({});
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

describe('useAds — kararlı referans', () => {
  it('aynı veri ve konumda render arası AYNI dizi döner', async () => {
    mockGetActive.mockReset();
    setServerLimits(null);
    mockGetActive.mockResolvedValue({ data: [ad({ id: 'a' })] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useAds('header'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const first = result.current.ads;
    rerender({});
    expect(result.current.ads).toBe(first);
  });
});
