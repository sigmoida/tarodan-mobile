/**
 * Ana sayfa hero sarmalayıcısı: admin uygulama için hero'yu kapattıysa ya da yükleniyorsa
 * (boş liste) sarmalayıcı View hiç çizilmez — ilk bölüm tek bölüm aralığıyla başlar.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

let mockHero: { slides: unknown[]; locale: string; loadingSlides: boolean } = {
  slides: [],
  locale: 'tr',
  loadingSlides: false,
};

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({ api: { get: jest.fn(() => Promise.resolve({})) } }));
jest.mock('@/services/logger', () => ({ logger: { debug: jest.fn() }, safeError: (e: unknown) => e }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: false }) }));
jest.mock('@/stores/guestStore', () => ({
  useGuestStore: (sel: (s: { incrementListingView: () => void }) => unknown) => sel({ incrementListingView: jest.fn() }),
}));
jest.mock('@/components/SignupPrompt', () => ({ SignupPrompt: () => null }));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => {
    const { View: V } = require('react-native');
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
  useHomeData: () => ({ refetchAll: jest.fn(), manufacturers: [], topCollections: [] }),
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
jest.mock('../_components/HeroSlider', () => ({
  HeroSection: () => {
    const { View: V } = require('react-native');
    return <V testID="hero-section" />;
  },
}));

import HomeScreen from '../index';

const slide = { id: 's1' };

describe('ana sayfa hero sarmalayıcısı', () => {
  it('liste boşken sarmalayıcı ve hero çizilmez', () => {
    mockHero = { slides: [], locale: 'tr', loadingSlides: false };
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-hero')).toBeNull();
    expect(screen.queryByTestId('hero-section')).toBeNull();
  });

  it('yüklenirken sarmalayıcı yok (yer ayrılmaz)', () => {
    mockHero = { slides: [], locale: 'tr', loadingSlides: true };
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-hero')).toBeNull();
  });

  it('slayt varken sarmalayıcı ve hero çizilir', () => {
    mockHero = { slides: [slide], locale: 'tr', loadingSlides: false };
    render(<HomeScreen />);
    expect(screen.getByTestId('home-hero')).toBeTruthy();
    expect(screen.getByTestId('hero-section')).toBeTruthy();
  });
});
