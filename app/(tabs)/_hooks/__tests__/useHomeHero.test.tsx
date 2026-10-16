/**
 * useHomeHero — slayt kararları `select` ile veri+dil anahtarlı üretilir:
 * aynı girdide render'lar arası AYNI dizi (gereksiz yeniden çizim yok), dil
 * değişince yeniden hesaplanır, zarflı/zarfsız gövde ve uç hatası `[]`.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSlides = jest.fn();
jest.mock('@/lib/api', () => ({
  heroApi: {
    getSlides: (...a: unknown[]) => mockGetSlides(...a),
  },
}));

let mockLang = 'tr';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockLang } }),
}));

import { useHomeHero } from '../useHomeHero';

const slide = (id: string, over: Record<string, unknown> = {}) => ({
  id, placement: 'home', imageUrl: 'https://cdn/x.jpg', mobileImageUrl: null, imageSide: 'left',
  title: { tr: 'Başlık', en: 'Title' }, subtitle: null, imageAlt: null, cta1: null, cta2: null,
  hideOnIos: false, ...over,
});

function run() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useHomeHero(), { wrapper });
}

describe('useHomeHero', () => {
  beforeEach(() => {
    mockLang = 'tr';
    mockGetSlides.mockReset();
  });

  it('zarflı gövdeden görünür slaytları süzer; render arası aynı referans', async () => {
    mockGetSlides.mockResolvedValue({
      data: { data: [slide('a'), slide('b', { hideOnIos: true }), slide('c', { cta1: { label: { tr: 'x' }, href: 'http://tarodan.com.tr/membership' } })] },
    });
    const { result, rerender } = run();
    await waitFor(() => expect(result.current.loadingSlides).toBe(false));
    expect(result.current.slides.map((s) => s.id)).toEqual(['a']);
    const first = result.current.slides;
    rerender({});
    expect(result.current.slides).toBe(first);
  });

  it("platform: 'web' slayt elenir (sunucu süzmese bile)", async () => {
    mockGetSlides.mockResolvedValue({
      data: [slide('a', { platform: 'app' }), slide('b', { platform: 'web' }), slide('c', { platform: 'all' }), slide('d')],
    });
    const { result } = run();
    await waitFor(() => expect(result.current.loadingSlides).toBe(false));
    expect(result.current.slides.map((s) => s.id)).toEqual(['a', 'c', 'd']);
    expect(mockGetSlides).toHaveBeenCalledWith('home');
  });

  it('admin uygulama için hero kapattı ([]) → boş liste, yükleme biter', async () => {
    mockGetSlides.mockResolvedValue({ data: [] });
    const { result } = run();
    await waitFor(() => expect(result.current.loadingSlides).toBe(false));
    expect(result.current.slides).toEqual([]);
  });

  it('uç hatası → [] (güven rozeti isteği yok)', async () => {
    mockGetSlides.mockRejectedValue(new Error('x'));
    const { result } = run();
    await waitFor(() => expect(result.current.loadingSlides).toBe(false));
    expect(result.current.slides).toEqual([]);
    expect(result.current).not.toHaveProperty('badges');
  });

  it('veri yokken boş liste her render aynı referanstır', () => {
    mockGetSlides.mockReturnValue(new Promise(() => {}));
    const { result, rerender } = run();
    const first = result.current.slides;
    rerender({});
    expect(result.current.slides).toBe(first);
    expect(result.current.loadingSlides).toBe(true);
  });
});
