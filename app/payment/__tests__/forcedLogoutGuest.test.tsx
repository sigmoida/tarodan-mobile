/**
 * Zorunlu çıkıştan sonra cihaz misafir modunda: A'nın ödeme yetki belirteci
 * misafir oturumunda kullanılamamalı.
 *
 * Zorunlu çıkış (401) belirteçleri silmez: A'nın süren ödemesi A yeniden girince
 * sürsün. Bu yüzden her kayıt kimin adına alındığını taşır (hesap id'si, misafirse
 * `null`); misafir istekleri (`guestApi`) yalnız sahipsiz belirteci ekler.
 *
 * Gerçek `authStore` + gerçek `paymentsApi` + mock'lu axios istemcisi: başlığın
 * tel üzerinde GİTMEDİĞİ doğrulanır.
 */
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  guestApi: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  advanceSessionEpoch: jest.fn(),
  paymentsApi: jest.requireActual('@/lib/api/checkout').paymentsApi,
}));
jest.mock('@/services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, guestApi } from '@/lib/api/client';
import { paymentsApi } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import { __resetPaymentCapabilities } from '@/lib/payment/paymentCapability';
import { __resetVerifyPacer } from '@/lib/payment/verifyPacer';
import PaymentSuccessScreen from '../success';

const apiGet = api.get as jest.Mock;
const apiPost = api.post as jest.Mock;
const guestGet = guestApi.get as jest.Mock;
const guestPost = guestApi.post as jest.Mock;
const forbidden = () => Promise.reject(Object.assign(new Error('403'), { response: { status: 403 } }));

const user = (id: string): User => ({
  id,
  email: `${id}@test.com`,
  displayName: id,
  membershipTier: 'free',
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  verificationStatus: 'verified',
  isSeller: false,
  totalSales: 0,
  totalPurchases: 0,
  accountAge: 1,
  profileCompletion: 100,
  disputeCount: 0,
  listingCount: 0,
  maxFreeListings: 10,
  createdAt: new Date().toISOString(),
});

/** Arkadaki depo işlemlerinin bitmesini bekle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A üye olarak ödeme başlatır (belirteç A adına saklanır), sonra oturumu düşer. */
async function aStartsPaymentThenSessionDrops() {
  await useAuthStore.getState().login('token-a', user('a'));
  apiPost.mockResolvedValueOnce({ data: { paymentId: 'pay-a', paymentAccessToken: 'cap-a' } });
  await paymentsApi.initiateGroup('g-1');
  await flush();
  await useAuthStore.getState().logout({ reason: 'forced' });
  await flush();
}

beforeEach(async () => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
  __resetVerifyPacer();
  await AsyncStorage.clear();
  // Sunucu belirteçsiz misafir isteğini reddeder.
  guestGet.mockImplementation(forbidden);
  guestPost.mockImplementation(forbidden);
});

afterEach(() => {
  jest.useRealTimers();
});

it('A zorunlu çıkış yaptı; misafir /payment/success?paymentId=A&guest=1 açıyor: A\'nın belirteci eklenmiyor', async () => {
  await aStartsPaymentThenSessionDrops();
  // Belirteç cihazda duruyor (A geri dönerse ödeme sürsün diye).
  expect(await AsyncStorage.getItem('payment-capability.pay-a')).not.toBeNull();

  jest.useFakeTimers();
  mockParams = { paymentId: 'pay-a', guest: '1' };
  renderWithProviders(<PaymentSuccessScreen />);
  await jest.advanceTimersByTimeAsync(20_000);

  await waitFor(() => expect(guestGet).toHaveBeenCalledWith('/payments/pay-a/status-guest', expect.anything()));
  expect(guestPost).toHaveBeenCalledWith('/payments/pay-a/verify', {}, expect.anything());
  for (const [, config] of guestGet.mock.calls) expect(config.headers).not.toHaveProperty('X-Payment-Capability');
  for (const [, , config] of guestPost.mock.calls) expect(config.headers).not.toHaveProperty('X-Payment-Capability');
  expect(apiGet).not.toHaveBeenCalled(); // Bearer'lı istemci de kullanılmadı
});

it('A yeniden girince aynı ödemenin durumu A\'nın belirteciyle okunur', async () => {
  await aStartsPaymentThenSessionDrops();
  await useAuthStore.getState().login('token-a2', user('a'));
  await flush();
  apiGet.mockResolvedValue({ data: { id: 'pay-a', status: 'pending' } });
  await paymentsApi.getStatusLight('pay-a');
  expect(apiGet).toHaveBeenCalledWith('/payments/pay-a/status', { headers: { 'X-Payment-Capability': 'cap-a' } });
});
