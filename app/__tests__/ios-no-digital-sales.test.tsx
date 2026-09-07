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
}));
import { api, membershipApi, paymentsApi } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MembershipScreen from '../membership/index';
import SubscriptionSettingsScreen from '../settings/subscription/index';
import SavedSearchesScreen from '../settings/saved-searches/index';
import CollectionsScreen from '../settings/collections';
import { STORAGE_KEY } from '../settings/saved-searches/_lib/types';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;
const mockGetMyPayments = paymentsApi.getMyPayments as jest.Mock;
const mockApiGet = api.get as jest.Mock;

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

describe('iOS: dijital satış çağrısı yok — abonelik ayarları (ücretsiz kullanıcı)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true };
    // Ücretsiz kullanıcı senaryosu: ios-reactivate-gate.test.tsx yalnız
    // premium/iptal edilmiş durumları kapsıyor, "hiç abone olmayan" burada.
    mockGetMembership.mockResolvedValue({ data: null });
    mockGetMyPayments.mockResolvedValue({ data: [] });
  });

  it('kendi paket adı (Ücretsiz) görünür; yükseltme düğmesi ve promosu yok', async () => {
    renderWithProviders(<SubscriptionSettingsScreen />);
    expect(await screen.findByText('membership.freeMembership')).toBeTruthy();
    expect(screen.queryByText('membership.upgradeToPremium')).toBeNull();
    expect(screen.queryByText('membership.freePlanPromo')).toBeNull();
  });
});

describe('iOS: dijital satış çağrısı yok — kayıtlı aramalar (limit dolu)', () => {
  const savedSearch = {
    id: 's1',
    name: 'BMW 1/18',
    query: 'bmw',
    filters: {},
    notifyEnabled: false,
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, limits: { maxSavedSearches: 1 } };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([savedSearch]));
  });

  it('kendi sayaç durumu (1/1) görünür; yükseltme bağlantısı yok', async () => {
    renderWithProviders(<SavedSearchesScreen />);
    // Limit dolu bandı — kullanıcının KENDİ durumu, kalmalı.
    expect(await screen.findByText('savedSearch.limitReached')).toBeTruthy();
    // Bant içindeki "Premium" bağlantısı UpgradeCta ile sarılı — iOS'ta render edilmemeli.
    expect(screen.queryByText('membership.premium')).toBeNull();
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
