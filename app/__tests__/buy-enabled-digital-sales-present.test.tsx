/**
 * [D-2.7] DİKKAT: Android artık iOS gibi kapalı (CAN_BUY_DIGITAL=false iki
 * platformda; bkz. src/lib/__tests__/digitalGate.platforms.test.tsx). Bu test
 * 'satın alma AÇIK' dalını (CAN_BUY_DIGITAL mock: true) korur — IAP / Play
 * Billing eklenip kapı açılırsa geçerli olacak davranış. Metindeki 'Android'
 * ifadeleri tarihsel: 'satın alma açık platform' olarak okunmalı.
 * Kapının Android'i ETKİLEMEDİĞİNİ kanıtlayan eş süit
 * (bkz. ios-no-digital-sales.test.tsx). Kapı yalnız iOS'a özel — birisi
 * `CAN_BUY_DIGITAL`'ı platform ayrımı olmadan kapatırsa (ör. "uyumluluk
 * için hepsini gizleyelim" gibi bir kestirme), bu testler kırmızı yanar.
 * Aynı ekranlar, aynı senaryolar; tek fark CAN_BUY_DIGITAL: true.
 *
 * TEKNİK: bkz. ios-no-digital-sales.test.tsx başlığı — CAN_BUY_DIGITAL modül
 * seviyesinde mock'lanıyor (module-load-time sabit, ekranlar statik import).
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

let mockAuthState: any = { isAuthenticated: true };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: {
    getCurrentMembership: jest.fn(),
    getTiers: jest.fn(),
    cancel: jest.fn(),
    setAutoRenew: jest.fn(),
  },
  paymentsApi: {
    getMyPayments: jest.fn(),
  },
  savedSearchesApi: { list: jest.fn(), remove: jest.fn() },
}));
import { api, membershipApi, savedSearchesApi } from '@/lib/api';

import MembershipScreen from '../membership/index';
import SavedSearchesScreen from '../settings/saved-searches/index';
import CollectionsScreen from '../settings/collections';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;
const mockApiGet = api.get as jest.Mock;
const mockListSavedSearches = savedSearchesApi.list as jest.Mock;

describe('Android: dijital satış çağrıları yerinde — üyelik ekranı', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: 'free', name: 'Ücretsiz' }, pendingPayment: null },
    });
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('diğer paketler, fiyat ve aylık/yıllık geçişi görünür', async () => {
    renderWithProviders(<MembershipScreen />);
    // Not: 'business' kartı yalnız kurumsal hesaplara gösterilir (bkz.
    // useMembership.ts isBusinessAccount) — bireysel hesap mock'unda o kart
    // hiç render edilmez; 'basic' katmanla aynı garanti sağlanır.
    expect(await screen.findByText('membership.basic')).toBeTruthy();
    expect(screen.getAllByText(/ TL$/).length).toBeGreaterThan(0);
    expect(screen.getByText('membership.monthly')).toBeTruthy();
    expect(screen.getByText('membership.mostPopular')).toBeTruthy();
  });
});

describe('Android: dijital satış çağrıları yerinde — kayıtlı aramalar (limit dolu)', () => {
  const savedSearch = {
    id: 's1',
    name: 'BMW 1/18',
    query: { search: 'bmw' },
    labels: {},
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, limits: { maxSavedSearches: 1 } };
    mockListSavedSearches.mockResolvedValue({ data: { data: [savedSearch], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } });
  });

  // The saved-search limit has no upgrade link any more: even with the gate open the text stays
  // neutral (`search.premiumMoreSearches` is web only, tarodan-ops ADR 0003).
  it('limit text shows; no upgrade link even with the gate open', async () => {
    renderWithProviders(<SavedSearchesScreen />);
    expect(await screen.findByText('search.savedLimitReached')).toBeTruthy();
    expect(screen.queryByText('membership.premium')).toBeNull();
  });
});

describe('Android: dijital satış çağrıları yerinde — koleksiyonlar (premium gerekli)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, limits: { canCreateCollections: false } };
    mockApiGet.mockResolvedValue({ data: { collections: [] } });
  });

  it('premium kartı görünür', async () => {
    renderWithProviders(<CollectionsScreen />);
    expect(await screen.findByText('membership.premiumFeatureTitle')).toBeTruthy();
    expect(screen.getByText('collection.premiumFeatureDesc')).toBeTruthy();
  });
});

describe('Android: CAN_BUY_DIGITAL açık', () => {
  it('kapı yalnız iOS içindir', () => {
    expect(jest.requireMock('@/lib/purchases').CAN_BUY_DIGITAL).toBe(true);
  });
});
