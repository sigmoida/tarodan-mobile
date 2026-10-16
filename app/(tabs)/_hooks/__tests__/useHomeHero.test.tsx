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
  HERO_CLIENT_PLATFORM: 'app',
  heroApi: {
    getSlides: (...a: unknown[]) => mockGetSlides(...a),
  },
}));

let mockLastHad = false;
const mockWriteLastHad = jest.fn();
jest.mock('@/lib/hero/lastHadSlides', () => ({
  useLastHadSlides: () => mockLastHad,
  writeLastHadSlides: (...a: unknown[]) => mockWriteLastHad(...a),
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
    mockLastHad = false;
    mockWriteLastHad.mockClear();
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

  describe('yer tutma (reserveSpace)', () => {
    it('yükleniyor + son açılışta hero vardı → true', () => {
      mockLastHad = true;
      mockGetSlides.mockReturnValue(new Promise<never>(() => undefined));
      const { result } = run();
      expect(result.current.reserveSpace).toBe(true);
    });

    it('yükleniyor ama son açılışta hero yoktu → false (boşluk oluşmaz)', () => {
      mockGetSlides.mockReturnValue(new Promise<never>(() => undefined));
      const { result } = run();
      expect(result.current.loadingSlides).toBe(true);
      expect(result.current.reserveSpace).toBe(false);
    });

    it('cevap gelince yer tutma biter', async () => {
      mockLastHad = true;
      mockGetSlides.mockResolvedValue({ data: [slide('a')] });
      const { result } = run();
      await waitFor(() => expect(result.current.loadingSlides).toBe(false));
      expect(result.current.reserveSpace).toBe(false);
    });
  });

  describe('lastHadSlides bayrağı', () => {
    it('başarılı cevapta görünür slayt varsa true yazılır', async () => {
      mockGetSlides.mockResolvedValue({ data: [slide('a')] });
      const { result } = run();
      await waitFor(() => expect(result.current.loadingSlides).toBe(false));
      expect(mockWriteLastHad).toHaveBeenCalledWith(true);
    });

    it('başarılı ama boş ([] — hero kapalı) ya da hepsi süzülmüşse false yazılır', async () => {
      mockGetSlides.mockResolvedValue({ data: [slide('w', { platform: 'web' })] });
      const { result } = run();
      await waitFor(() => expect(result.current.loadingSlides).toBe(false));
      expect(mockWriteLastHad).toHaveBeenCalledWith(false);
    });

    it('uç hatasında bayrak DEĞİŞMEZ', async () => {
      mockLastHad = true;
      mockGetSlides.mockRejectedValue(new Error('x'));
      const { result } = run();
      await waitFor(() => expect(result.current.loadingSlides).toBe(false));
      expect(mockWriteLastHad).not.toHaveBeenCalled();
    });
  });

  it('refetch sorguyu yeniden çeker (pull-to-refresh)', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide('a')] });
    const { result } = run();
    await waitFor(() => expect(result.current.loadingSlides).toBe(false));
    await result.current.refetch();
    expect(mockGetSlides).toHaveBeenCalledTimes(2);
  });
});
