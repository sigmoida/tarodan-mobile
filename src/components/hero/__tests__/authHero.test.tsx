/**
 * Auth ekranı görseli (delta 24 P2): `auth_default` / `auth_register`. Görsel
 * yoksa / uç hata verirse / slayt bu istemcide gizliyse hiçbir şey çizilmez.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSlides = jest.fn();
jest.mock('@/lib/api', () => ({
  heroApi: { getSlides: (...a: unknown[]) => mockGetSlides(...a) },
}));

let mockLang = 'tr';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockLang }, t: (k: string) => k }),
}));

import { AuthHeroBanner } from '../AuthHeroBanner';
import { pickAuthHero } from '../useAuthHero';

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
});

describe('pickAuthHero', () => {
  it('ilk görünür slaytı alır; mobil görsel, dile göre metin, alt yoksa başlık', () => {
    const hero = pickAuthHero([slide(), slide({ id: 's2' })], 'tr');
    expect(hero).toMatchObject({
      id: 's1',
      imageUrl: 'https://cdn.example/mobile.jpg',
      title: 'Koleksiyonuna hoş geldin',
      subtitle: 'Alt',
      alt: 'Koleksiyonuna hoş geldin',
    });
    expect(pickAuthHero([slide()], 'en')).toMatchObject({ title: 'Welcome', subtitle: 'Sub' });
  });

  it('hideOnIos / satın alma hedefli / boş liste / bozuk gövde → null', () => {
    expect(pickAuthHero([slide({ hideOnIos: true })], 'tr')).toBeNull();
    expect(pickAuthHero([slide({ cta1: { label: { tr: 'Al' }, href: '/membership' } })], 'tr')).toBeNull();
    expect(pickAuthHero([], 'tr')).toBeNull();
    expect(pickAuthHero(undefined, 'tr')).toBeNull();
    expect(pickAuthHero({ data: [slide()] }, 'tr')).not.toBeNull();
  });
});

describe('AuthHeroBanner', () => {
  it('doğru yerleşimi ister ve başlık + alt başlığı çizer', async () => {
    mockGetSlides.mockResolvedValue({ data: [slide({ placement: 'auth_register' })] });
    const { findByTestId, getByText } = renderBanner('auth_register');
    await findByTestId('auth-hero');
    expect(mockGetSlides).toHaveBeenCalledWith('auth_register');
    expect(getByText('Koleksiyonuna hoş geldin')).toBeTruthy();
    expect(getByText('Alt')).toBeTruthy();
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
