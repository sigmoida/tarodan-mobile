/**
 * Ortak cihaz: A çıkış yapınca A'nın ödeme yetki belirteci B'nin oturumunda kalmamalı.
 *
 * Belirteç (`payment-capability.<paymentId>`) AsyncStorage'da kalıcı (banka
 * uygulamasına geçişte süreç ölürse ödemeye dönülebilsin diye). Çıkış
 * (`authStore.logout` → `resetUserStores`) tüm bu kayıtları siler. Açılışta
 * (`loadToken`) süresi dolmuş kayıtlar süpürülür.
 *
 * Gerçek `authStore` + gerçek `resetUserStores`; ağ ve push mock'lu.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  advanceSessionEpoch: jest.fn(),
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, type User } from '../authStore';
import {
  __resetPaymentCapabilities,
  PAYMENT_CAPABILITY_TTL_MS,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
} from '@/lib/payment/paymentCapability';

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

const capabilityKeys = async () =>
  (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('payment-capability.'));
/** Arkadaki depo işlemlerinin bitmesini bekle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  jest.restoreAllMocks();
  __resetPaymentCapabilities();
  await AsyncStorage.clear();
});

it('A çıkış yapınca A\'nın belirteci B\'nin oturumunda (ve yeniden başlatmada) yok', async () => {
  await useAuthStore.getState().login('token-a', user('a'));
  // A'nın üye ödemesi: initiate yanıtındaki belirteç saklandı.
  await rememberPaymentCapability({ data: { paymentId: 'pay-a', paymentAccessToken: 'cap-a' } });
  expect(await paymentCapabilityHeaders('pay-a')).toEqual({ 'X-Payment-Capability': 'cap-a' });
  expect(await capabilityKeys()).toEqual(['payment-capability.pay-a']);

  await useAuthStore.getState().logout();
  await flush();

  await useAuthStore.getState().login('token-b', user('b'));
  expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
  expect(await capabilityKeys()).toEqual([]);

  __resetPaymentCapabilities(); // B uygulamayı kapatıp açtı
  expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
});

it('açılışta (loadToken) süresi dolmuş kayıtlar süpürülür, geçerli olan kalır', async () => {
  const now = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(now - PAYMENT_CAPABILITY_TTL_MS - 60_000);
  await rememberPaymentCapability({ data: { paymentId: 'old', paymentAccessToken: 'cap-old' } });
  jest.spyOn(Date, 'now').mockReturnValue(now);
  await rememberPaymentCapability({ data: { paymentId: 'live', paymentAccessToken: 'cap-live' } });
  __resetPaymentCapabilities(); // uygulama yeniden açıldı

  // jest.setup Maestro oto-girişini açıyor; açılış yolunu ağsız (misafir) koştur.
  process.env.EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN = '1';
  try {
    await useAuthStore.getState().loadToken();
  } finally {
    delete process.env.EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN;
  }
  await flush();

  expect(await capabilityKeys()).toEqual(['payment-capability.live']);
});
