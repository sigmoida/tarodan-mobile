/**
 * App Store Guideline 3.1.1 / 3.1.3(g) / 2.1(b) regresyon ağı.
 *
 * iOS'ta uygulama içinde ne dijital satın alma ne de ona ÇAĞIRAN bir yüzey
 * olabilir. Task 1-8 bunu ekran ekran kapattı (bkz. `ios-*` eşleri);
 * bu süit onları TEK YERDE, birden çok ekranı gerçekten render ederek
 * doğrular — tek tek gizlemeler unutulabilir, bu süit unutulduğunda kırmızı
 * yanar.
 *
 * Her ekran için ikili iddia var: (1) yükseltme çağrısı / başka paket adı /
 * fiyat YOK, (2) kullanıcının KENDİ paketi / kendi limit durumu HÂLÂ görünür
 * — yalnız "hiçbir şey yok" değil, çünkü öyle bir assertion ekranın hiç
 * render OLMADIĞI (ör. hata fırlattığı) durumda da boş geçer ve hiçbir şey
 * kanıtlamaz. Android eşi: android-digital-sales-present.test.tsx.
 * Fiziksel ödeme yolunun iOS'ta AÇIK kaldığı zaten
 * app/payment/__tests__/webview.test.tsx (J75.5) içinde kanıtlanıyor —
 * burada tekrar edilmiyor.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül-yükleme-anındaki bir sabit ve ekranlar bu
 * dosyanın en üstünde statik import edildiği için `Platform.OS` gövde
 * içinde atansa da geç kalır. `@/lib/purchases`ı modül seviyesinde
 * mock'luyoruz — babel-plugin-jest-hoist bunu import'ların üstüne taşır.
 * (bkz. app/(tabs)/__tests__/messages.test.tsx, app/membership/__tests__/ios-membership-screen.test.tsx)
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
  CAN_BUY_DIGITAL: false,
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

describe('iOS: dijital satış çağrısı yok — üyelik ekranı', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: 'premium', name: 'Premium' }, pendingPayment: null },
    });
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('kendi paket adı görünür; diğer paketler, fiyat ve "yükselt" çağrısı yok', async () => {
    renderWithProviders(<MembershipScreen />);
    // Kendi paket adı (Premium) — bilinçli olarak KALMALI, kasıtlı istisna.
    expect(await screen.findByText('membership.premium')).toBeTruthy();
    // Diğer paket adı — kartlar bütünüyle kapalı olmalı. ('business' kartı
    // yalnız kurumsal hesaplara gösterildiğinden burada assert edilmiyor —
    // bireysel hesapta zaten platformdan bağımsız gizli, bu da onu boş geçen
    // bir iddia yapardı.)
    expect(screen.queryByText('membership.basic')).toBeNull();
    // Fiyat hiçbir biçimde görünmemeli (₺ işareti tüm ağaçta yok).
    expect(screen.queryByText(/₺/)).toBeNull();
    // Aylık/yıllık geçişi ve "en popüler" rozeti de fiyatlandırmanın parçası.
    expect(screen.queryByText('membership.monthly')).toBeNull();
    expect(screen.queryByText('membership.mostPopular')).toBeNull();
  });
});

describe('iOS: dijital satış çağrısı yok — kayıtlı aramalar (limit dolu)', () => {
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

  it('kendi sayaç durumu (1/1) görünür; yükseltme bağlantısı yok', async () => {
    renderWithProviders(<SavedSearchesScreen />);
    // The limit-reached band (server limit) is the user's OWN state and stays.
    expect(await screen.findByText('search.savedLimitReached')).toBeTruthy();
    // No upgrade call for the saved-search limit on any platform (tarodan-ops ADR 0003).
    expect(screen.queryByText('membership.premium')).toBeNull();
    expect(screen.queryByText('search.premiumMoreSearches')).toBeNull();
  });
});

describe('iOS: dijital satış çağrısı yok — koleksiyonlar (premium gerekli)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, limits: { canCreateCollections: false } };
    mockApiGet.mockResolvedValue({ data: { collections: [] } });
  });

  it('kendi boş durumu görünür; premium kartı kapalı', async () => {
    renderWithProviders(<CollectionsScreen />);
    // Ekranın gerçekten render olduğunun kanıtı — boş durum kendi hâli.
    expect(await screen.findByText('collection.noCollections')).toBeTruthy();
    // "Premium" kartı bütünüyle UpgradeCta ile sarılı, iOS'ta kapanmalı.
    expect(screen.queryByText('membership.premiumFeatureTitle')).toBeNull();
    expect(screen.queryByText('collection.premiumFeatureDesc')).toBeNull();
  });
});
