/**
 * Bulgu B eşi · Android/web davranışı DEĞİŞMEMELİ — bireysel karşılama alt
 * metni ve "Yükselt" butonu orada duruyor. iOS tarafı: ios-welcome-subtitle-neutral.test.tsx.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { WelcomeCard } from '../DashboardSections';
import type { SellerDashboardController } from '../../_hooks/useSellerDashboard';

function makeController(overrides: Partial<SellerDashboardController> = {}): SellerDashboardController {
  return {
    user: {} as any,
    isAuthenticated: true,
    isBusiness: false,
    isLoading: false,
    isRefetching: false,
    stats: {},
    activeListings: 0,
    pendingOrders: 0,
    monthly: 0,
    rating: 0,
    refresh: jest.fn(),
    ...overrides,
  } as SellerDashboardController;
}

describe('Android · satıcı panosu karşılama kartı bireysel alt metni ve yükselt butonu görünür', () => {
  it('orijinal yükselt alt metnini gösterir', () => {
    renderWithProviders(<WelcomeCard f={makeController()} />);
    expect(screen.getByText('sellerDashboard.welcomeSubtitleIndividual')).toBeOnTheScreen();
    expect(screen.queryByText('sellerDashboard.welcomeSubtitleIndividualNeutral')).toBeNull();
  });

  it('"Yükselt" butonu görünür', () => {
    renderWithProviders(<WelcomeCard f={makeController()} />);
    expect(screen.getByText('membership.upgrade')).toBeOnTheScreen();
  });
});
