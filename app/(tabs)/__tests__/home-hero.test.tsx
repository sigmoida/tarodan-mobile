/**
 * Ana sayfa hero sarmalayıcısı: admin uygulama için hero'yu kapattıysa ya da yükleniyorsa
 * (boş liste) sarmalayıcı View hiç çizilmez — ilk bölüm tek bölüm aralığıyla başlar.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

const mockRefetchHero = jest.fn(() => Promise.resolve());
const mockRefetchAll = jest.fn(() => Promise.resolve());
const mockResetHero = jest.fn();
let mockHero: { slides: unknown[]; locale: string; loadingSlides: boolean; reserveSpace: boolean; refetch: () => Promise<void> } = {
  slides: [],
  locale: 'tr',
  loadingSlides: false,
  reserveSpace: false,
  refetch: mockRefetchHero,
};
const hero = (over: Partial<typeof mockHero> = {}) => ({ ...mockHero, slides: [], loadingSlides: false, reserveSpace: false, ...over });

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({ api: { get: jest.fn(() => Promise.resolve({})) } }));
jest.mock('@/services/logger', () => ({ logger: { debug: jest.fn() }, safeError: (e: unknown) => e }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: (sel?: (s: { isAuthenticated: boolean }) => unknown) => {
    const state = { isAuthenticated: false };
    return sel ? sel(state) : state;
  } }));
jest.mock('@/stores/guestStore', () => ({
  useGuestStore: (sel: (s: { incrementListingView: () => void }) => unknown) => sel({ incrementListingView: jest.fn() }),
}));
jest.mock('@/components/SignupPrompt', () => ({ SignupPrompt: () => null }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => {
    const { View: V } = jest.requireActual('react-native');
    return <V>{children}</V>;
  },
}));
jest.mock('@/components/shell/tabBarLayout', () => ({ useTabBarInset: () => 0 }));
jest.mock('@/components/shell/floatingBar', () => ({
  floatingBarScrollProps: () => ({}),
  useFloatingBarInset: () => 0,
}));
jest.mock('@/components/shell/TabBarCollapse', () => ({
  useTabBarScrollHandler: () => ({ onScroll: jest.fn(), onContentSizeChange: jest.fn(), onLayout: jest.fn() }),
}));
jest.mock('@/components/ads/AdBanner', () => ({ AdBanner: () => null }));
jest.mock('@/components/ads/PopupAd', () => ({ PopupAd: () => null }));
jest.mock('@/lib/ads/useAdSession', () => ({ useAdSession: () => ({}) }));
jest.mock('../_hooks/useHomeData', () => ({
  useHomeData: () => ({ refetchAll: mockRefetchAll, manufacturers: [], topCollections: [] }),
}));
jest.mock('../_hooks/useHomeGuestPrompt', () => ({
  useHomeGuestPrompt: () => ({ showPrompt: false, promptType: null, dismissPrompt: jest.fn() }),
}));
jest.mock('../_hooks/useHomeHero', () => ({ useHomeHero: () => mockHero }));
jest.mock('../_components/HomeBrands', () => ({ BrandsStrip: () => null }));
jest.mock('../_components/HomeRails', () => ({
  FeaturedRail: () => null,
  OnSaleRail: () => null,
  TradeRail: () => null,
  PopularRail: () => null,
}));
jest.mock('../_components/HomeCollections', () => ({ TopCollections: () => null }));
jest.mock('../_components/HomeSpotlights', () => ({ Spotlights: () => null }));
jest.mock('../_hooks/useHeroVisibility', () => ({
  useHeroVisibility: () => ({
    visible: true,
    onScroll: jest.fn(),
    onScrollOffset: jest.fn(),
    onViewportLayout: jest.fn(),
    onHeroLayout: jest.fn(),
    resetHero: mockResetHero,
  }),
}));
jest.mock('../_components/HeroSlider', () => ({
  HeroSection: () => {
    const { View: V } = jest.requireActual('react-native');
    return <V testID="hero-section" />;
  },
}));

import HomeScreen from '../index';

const slide = { id: 's1' };

describe('ana sayfa hero sarmalayıcısı', () => {
  beforeEach(() => {
    mockRefetchHero.mockClear();
    mockRefetchAll.mockClear();
    mockResetHero.mockClear();
  });

  it('liste boşken sarmalayıcı, hero ve yer tutucu çizilmez', () => {
    mockHero = hero();
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-hero')).toBeNull();
    expect(screen.queryByTestId('hero-section')).toBeNull();
    expect(screen.queryByTestId('hero-reserved')).toBeNull();
  });

  it('yükleniyor ve son açılışta hero yoktu → yer tutulmaz', () => {
    mockHero = hero({ loadingSlides: true });
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-hero')).toBeNull();
    expect(screen.queryByTestId('hero-reserved')).toBeNull();
  });

  it('yükleniyor ve son açılışta hero vardı → yer tutucu çizilir, sarmalayıcı yok', () => {
    mockHero = hero({ loadingSlides: true, reserveSpace: true });
    render(<HomeScreen />);
    expect(screen.getByTestId('hero-reserved')).toBeTruthy();
    expect(screen.queryByTestId('home-hero')).toBeNull();
  });

  it('slayt varken sarmalayıcı ve hero çizilir', () => {
    mockHero = hero({ slides: [slide] });
    render(<HomeScreen />);
    expect(screen.getByTestId('home-hero')).toBeTruthy();
    expect(screen.getByTestId('hero-section')).toBeTruthy();
    expect(screen.queryByTestId('hero-reserved')).toBeNull();
    expect(mockResetHero).not.toHaveBeenCalled();
  });

  it('sarmalayıcı yokken görünürlük ölçümü sıfırlanır', () => {
    mockHero = hero();
    render(<HomeScreen />);
    expect(mockResetHero).toHaveBeenCalled();
  });

  it('pull-to-refresh hero sorgusunu da tazeler', async () => {
    mockHero = hero({ slides: [slide] });
    const { UNSAFE_root } = render(<HomeScreen />);
    const withRefresh = UNSAFE_root.findAll((n: { props?: { refreshControl?: unknown } }) => !!n.props?.refreshControl)[0]!;
    await act(async () => {
      await withRefresh.props.refreshControl.props.onRefresh();
    });
    expect(mockRefetchAll).toHaveBeenCalledTimes(1);
    expect(mockRefetchHero).toHaveBeenCalledTimes(1);
  });
});
