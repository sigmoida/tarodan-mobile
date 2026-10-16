/**
 * Ana sayfa algılanan hız: ilk kare yalnız üst bölümleri (markalar, Öne Çıkan, İndirimdekiler) içerikle
 * çizer; alt bölümler (Takas, Popüler, Koleksiyonlar, Haftanın…) ilk kareden sonra bağlanır, o ana dek
 * iskelet (yükleniyor). Açılışta yalnız log için `/health` isteği atılmaz.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockApiGet = jest.fn(() => Promise.resolve({}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({ api: { get: mockApiGet } }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: { isAuthenticated: boolean }) => unknown) => {
    const state = { isAuthenticated: false };
    return sel ? sel(state) : state;
  },
}));
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
  useHomeData: () => ({
    refetchAll: jest.fn(),
    manufacturers: [],
    loadingManufacturers: true,
    featured: [],
    onSale: [],
    trade: [],
    popular: [],
    topCollections: [],
    featuredCollector: null,
    featuredBusiness: null,
    loadingFeatured: false,
    loadingOnSale: false,
    loadingTrade: false,
    loadingPopular: false,
    loadingTopCollections: false,
    loadingSpotlights: false,
  }),
}));
jest.mock('../_hooks/useHomeGuestPrompt', () => ({
  useHomeGuestPrompt: () => ({ showPrompt: false, promptType: null, dismissPrompt: jest.fn() }),
}));
jest.mock('../_hooks/useHomeHero', () => ({
  useHomeHero: () => ({ slides: [], locale: 'tr', loadingSlides: false, reserveSpace: false, refetch: jest.fn() }),
}));
jest.mock('../_hooks/useHeroVisibility', () => ({
  useHeroVisibility: () => ({
    visible: true,
    onScrollOffset: jest.fn(),
    onViewportLayout: jest.fn(),
    onHeroLayout: jest.fn(),
    resetHero: jest.fn(),
  }),
}));

/** Bölüm taklidi: yükleniyor mu, testID'den okunur. */
const section = (name: string) => (props: { isLoading?: boolean }) => {
  const { View: V } = jest.requireActual('react-native');
  return <V testID={`${name}-${props.isLoading ? 'loading' : 'ready'}`} />;
};
jest.mock('../_components/HomeBrands', () => ({ BrandsStrip: section('brands') }));
jest.mock('../_components/HomeRails', () => ({
  FeaturedRail: section('featured'),
  OnSaleRail: section('onsale'),
  TradeRail: section('trade'),
  PopularRail: section('popular'),
}));
jest.mock('../_components/HomeCollections', () => ({ TopCollections: section('collections') }));
jest.mock('../_components/HomeSpotlights', () => ({ Spotlights: section('spotlights') }));

import HomeScreen from '../index';

describe('ana sayfa — alt bölümler ilk kareden sonra', () => {
  it('ilk karede üst bölümler içerikli, alt bölümler iskelet; kare sonrası alt bölümler bağlanır', async () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('featured-ready')).toBeTruthy();
    expect(screen.getByTestId('onsale-ready')).toBeTruthy();
    // Marka şeridi yükleniyor bayrağını alır (iskelet, null değil).
    expect(screen.getByTestId('brands-loading')).toBeTruthy();
    for (const name of ['trade', 'popular', 'collections', 'spotlights']) {
      expect(screen.getByTestId(`${name}-loading`)).toBeTruthy();
    }

    await waitFor(() => expect(screen.getByTestId('trade-ready')).toBeTruthy());
    for (const name of ['popular', 'collections', 'spotlights']) {
      expect(screen.getByTestId(`${name}-ready`)).toBeTruthy();
    }
  });

  it('açılışta yalnız log için /health isteği atılmaz', () => {
    render(<HomeScreen />);
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
