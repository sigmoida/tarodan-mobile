/**
 * Bulgu B · iOS'ta satıcı panosu karşılama kartının bireysel alt metni
 * ("Daha fazla avantaj için işletme hesabına yükselebilirsin.") kurumsal
 * (Business) kademeye davet ediyordu — "Yükselt" butonu UpgradeCta ile zaten
 * gizliydi ama metin asılı kalıyordu. iOS'ta nötr bir alt metne düşer.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül seviyesinde mock'lanmalı (bkz. ios-manage-hint-hidden.test.tsx).
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
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

describe('iOS · satıcı panosu karşılama kartı bireysel alt metni nötr', () => {
  it('yükselt çağrısı içeren metin yerine nötr metin gösterir', () => {
    renderWithProviders(<WelcomeCard f={makeController()} />);
    expect(screen.getByText('sellerDashboard.welcomeSubtitleIndividualNeutral')).toBeOnTheScreen();
    expect(screen.queryByText('sellerDashboard.welcomeSubtitleIndividual')).toBeNull();
  });

  it('"Yükselt" butonu (UpgradeCta) hâlâ gizli', () => {
    renderWithProviders(<WelcomeCard f={makeController()} />);
    expect(screen.queryByText('membership.upgrade')).toBeNull();
  });
});
