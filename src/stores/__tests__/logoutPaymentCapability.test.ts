/**
 * Ortak cihaz: A çıkış yapınca A'nın ödeme yetki belirteci B'nin oturumunda kalmamalı.
 *
 * Belirteç (`payment-capability.<paymentId>`) AsyncStorage'da kalıcı (banka
 * uygulamasına geçişte süreç ölürse ödemeye dönülebilsin diye). Çıkışın iki yolu:
 *  - Kullanıcının kendi çıkışı (`logout()` → `resetUserStores('user')`): tüm
 *    kayıtlar silinir.
 *  - Zorunlu çıkış (401 → `client.ts` `handleAuthFailure` →
 *    `logout({ reason: 'forced' })`): kayıtlar KALIR (3DS sürerken başka bir
 *    isteğin 401'i süren ödemeyi düşürmesin). Başka bir hesapla girişte
 *    (`login` → `bindPaymentCapabilitiesToAccount`) silinir.
 * Açılışta (`loadToken`) süresi dolmuş kayıtlar süpürülür.
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
import * as SecureStore from 'expo-secure-store';
import { userApi } from '@/lib/api';
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

describe('zorunlu çıkış (401): süren ödemenin belirteci kalır', () => {
  async function aStartsPaymentThenSessionDrops() {
    await useAuthStore.getState().login('token-a', user('a'));
    await rememberPaymentCapability({ data: { paymentId: 'pay-a', paymentAccessToken: 'cap-a' } });
    await useAuthStore.getState().logout({ reason: 'forced' });
    await flush();
  }

  it('belirteç bellekte ve depoda kalır (başarı ekranı durumu onunla okur)', async () => {
    await aStartsPaymentThenSessionDrops();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({ 'X-Payment-Capability': 'cap-a' });
    expect(await capabilityKeys()).toEqual(['payment-capability.pay-a']);
  });

  it('aynı hesap yeniden girer (yeniden başlatma dahil): belirteç kalır', async () => {
    await aStartsPaymentThenSessionDrops();
    __resetPaymentCapabilities(); // uygulama kapanıp açıldı
    await useAuthStore.getState().login('token-a2', user('a'));
    await flush();
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({ 'X-Payment-Capability': 'cap-a' });
  });

  it('başka hesap girer: A\'nın belirteci B\'nin oturumunda yok (bellek + depo)', async () => {
    await aStartsPaymentThenSessionDrops();
    await useAuthStore.getState().login('token-b', user('b'));
    await flush();
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    expect(await capabilityKeys()).toEqual([]);
  });

  it('oturum açılışta yüklendiyse (login çağrılmadan, önceki sürümden): hesap yine işaretlenir', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(key === 'accessToken' ? 'token-a' : null),
    );
    (userApi.getProfile as jest.Mock).mockResolvedValue({ data: user('a') });
    try {
      await useAuthStore.getState().loadToken();
    } finally {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(() => Promise.resolve(null));
    }
    await rememberPaymentCapability({ data: { paymentId: 'pay-a', paymentAccessToken: 'cap-a' } });
    await useAuthStore.getState().logout({ reason: 'forced' });
    await useAuthStore.getState().login('token-b', user('b'));
    await flush();
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
  });

  it('başka hesap yeniden başlatmadan sonra girer: yine silinir (hesap işareti depoda)', async () => {
    await aStartsPaymentThenSessionDrops();
    __resetPaymentCapabilities();
    await useAuthStore.getState().login('token-b', user('b'));
    await flush();
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    expect(await capabilityKeys()).toEqual([]);
  });
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
