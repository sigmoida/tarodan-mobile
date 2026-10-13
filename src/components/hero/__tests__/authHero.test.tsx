/**
 * Auth ekranı görseli (delta 24 P2): `auth_default` / `auth_register`. Görsel
 * yoksa / uç hata verirse / slayt bu istemcide gizliyse hiçbir şey çizilmez.
 */
import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSlides = jest.fn();
jest.mock('@/lib/api', () => ({
  heroApi: { getSlides: (...a: unknown[]) => mockGetSlides(...a) },
}));

let mockLang = 'tr';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockLang }, t: (k: string) => k }),
}));

/** Pencere genişliği: varsayılan iPad yatay (görsel yalnız ≥ 1024pt — web `lg`). */
let mockWindowWidth = 1366;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 1024, scale: 2, fontScale: 1 }),
}));

import { AUTH_HERO_MIN_WIDTH, AuthHeroBanner } from '../AuthHeroBanner';
import { authHeroFrom, useAuthHero } from '../useAuthHero';
import { useHeroSlides } from '@/lib/hero/useHeroSlides';
import { qk } from '@/lib/query';

const slide = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  placement: 'auth_default',
  imageUrl: 'https://cdn.example/desk.jpg',
  mobileImageUrl: 'https://cdn.example/mobile.jpg',
  imageSide: 'right',
  title: { tr: 'Koleksiyonuna hoş geldin', en: 'Welcome' },
  subtitle: { tr: 'Alt', en: 'Sub' },
  imageAlt: null,
  cta1: null,
  cta2: null,
  hideOnIos: false,
  ...over,
});

const renderBanner = (placement: 'auth_default' | 'auth_register' = 'auth_default') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthHeroBanner placement={placement} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mockGetSlides.mockReset();
  mockLang = 'tr';
  mockWindowWidth = 1366;
});

describe('authHeroFrom', () => {
  it('ilk slaytı alır; mobil görsel, dile göre metin, alt yoksa başlık', () => {
    const hero = authHeroFrom([slide(), slide({ id: 's2' })] as any, 'tr');
    expect(hero).toMatchObject({
      id: 's1',
      imageUrl: 'https://cdn.example/mobile.jpg',
      title: 'Koleksiyonuna hoş geldin',
      subtitle: 'Alt',
      alt: 'Koleksiyonuna hoş geldin',
    });
    expect(authHeroFrom([slide()] as any, 'en')).toMatchObject({ title: 'Welcome', subtitle: 'Sub' });
  });

  it('boş liste → null', () => {
    expect(authHeroFrom([], 'tr')).toBeNull();
  });
});

describe('ortak hero sorgusu (useHeroSlides)', () => {
  const wrap = (client: QueryClient) => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it('home ve auth AYNI önbellek şeklini (düz dizi) ve aynı anahtarı paylaşır; zarflı gövde de açılır', async () => {
    mockGetSlides.mockResolvedValue({ data: { data: [slide({ placement: 'auth_default' })] } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const a = renderHook(() => useHeroSlides('auth_default'), { wrapper: wrap(client) });
    const b = renderHook(() => useAuthHero('auth_default'), { wrapper: wrap(client) });
    await waitFor(() => expect(a.result.current.slides).toHaveLength(1));
    await waitFor(() => expect(b.result.current).not.toBeNull());
    expect(mockGetSlides).toHaveBeenCalledTimes(1); // tek istek, tek sorgu
    const cached = client.getQueryData(qk.hero.slides('auth_default'));
    expect(Array.isArray(cached)).toBe(true); // zarf değil, düz liste
    expect(cached).toHaveLength(1);
  });

  it('süzme tek yerde: hideOnIos ve satın alma hedefli CTA slaytı gizlenir', async () => {
    mockGetSlides.mockResolvedValue({
      data: [slide({ id: 'h', hideOnIos: true }), slide({ id: 'b', cta1: { label: { tr: 'Al' }, href: '/membership' } })],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useHeroSlides('auth_default'), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slides).toEqual([]);
  });

  it('veri/dil değişmedikçe render arası AYNI dizi referansı', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide()] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(() => useHeroSlides('home'), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.slides).toHaveLength(1));
    const first = result.current.slides;
    rerender({});
    expect(result.current.slides).toBe(first);
  });
});

describe('AuthHeroBanner', () => {
  it('web lg ile aynı eşik: 1024pt', () => {
    expect(AUTH_HERO_MIN_WIDTH).toBe(1024);
  });

  it.each([390, 834, AUTH_HERO_MIN_WIDTH - 1])('telefon/dar pencere (%ipt): hiçbir şey çizilmez, slayt sorgusu atılmaz', async (width) => {
    mockWindowWidth = width;
    mockGetSlides.mockResolvedValue({ data: [slide()] });
    const { queryByTestId } = renderBanner();
    await act(async () => {});
    expect(queryByTestId('auth-hero')).toBeNull();
    expect(mockGetSlides).not.toHaveBeenCalled();
  });

  it('tam eşikte (1024pt) çizilir', async () => {
    mockWindowWidth = AUTH_HERO_MIN_WIDTH;
    mockGetSlides.mockResolvedValue({ data: [slide()] });
    const { findByTestId } = renderBanner();
    await findByTestId('auth-hero');
  });

  it('doğru yerleşimi ister ve başlık + alt başlığı çizer', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide({ placement: 'auth_register' })] });
    const { findByTestId, getByText } = renderBanner('auth_register');
    await findByTestId('auth-hero');
    expect(mockGetSlides).toHaveBeenCalledWith('auth_register');
    expect(getByText('Koleksiyonuna hoş geldin')).toBeTruthy();
    expect(getByText('Alt')).toBeTruthy();
  });

  it('görsel yüklenemezse (onError) hiçbir şey çizilmez; başlık da kaybolur', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide()] });
    const { findByTestId, queryByTestId, queryByText } = renderBanner();
    const image = await findByTestId('auth-hero-image');
    expect(queryByText('Koleksiyonuna hoş geldin')).toBeTruthy();
    act(() => image.props.onError({ nativeEvent: { error: 'HTTP 404' } }));
    expect(queryByTestId('auth-hero')).toBeNull();
    expect(queryByText('Koleksiyonuna hoş geldin')).toBeNull();
  });

  it('görsel yüklendiyse sonradan gelen onError bannerı kaldırmaz', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide()] });
    const { findByTestId, queryByTestId } = renderBanner();
    const image = await findByTestId('auth-hero-image');
    act(() => image.props.onLoad({ nativeEvent: { source: { width: 800, height: 400 } } }));
    act(() => image.props.onError({ nativeEvent: { error: 'x' } }));
    expect(queryByTestId('auth-hero')).toBeTruthy();
  });

  it('hideOnIos / satın alma hedefli slayt → hiçbir şey çizmez', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide({ hideOnIos: true })] });
    const { queryByTestId } = renderBanner();
    await waitFor(() => expect(mockGetSlides).toHaveBeenCalled());
    expect(queryByTestId('auth-hero')).toBeNull();
  });

  it('liste boşsa hiçbir şey çizmez', async () => {
    mockGetSlides.mockResolvedValue({ data: [] });
    const { queryByTestId } = renderBanner();
    await waitFor(() => expect(mockGetSlides).toHaveBeenCalled());
    expect(queryByTestId('auth-hero')).toBeNull();
  });

  it('uç hata verirse hata göstermeden hiçbir şey çizmez', async () => {
    mockGetSlides.mockRejectedValue(new Error('500'));
    const { queryByTestId } = renderBanner();
    await waitFor(() => expect(mockGetSlides).toHaveBeenCalled());
    expect(queryByTestId('auth-hero')).toBeNull();
  });
});
