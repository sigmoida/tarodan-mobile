/**
 * checkout-otp-alert-paths · OTP modalı AÇIKKEN ham `appAlert` kalmadı (takip T-1).
 *
 * I1 turunda `alertRespectingOtpModal` üç dallı bir sınıflandırmaya bölündü
 * (ertele / satır içi / kapat-sonra-göster) ama yalnızca kupon ve 409 yolları
 * bu makineden geçirilmişti. Misafir OTP modalı açıkken çalışabilen DÖRT yol
 * hâlâ doğrudan `appAlert` çağırıyordu — yani I1'in kapattığı iOS donma tuzağı
 * bu dallarda açık kalmıştı. Dördü de sınıflandırıldı:
 *
 *  1. `handleEmailAlreadyRegistered` (kod yeniden gönderilirken 409)
 *     → SONLANDIRICI: misafir akışı biter, kullanıcı login'e taşınır. Modalda
 *       girilecek bir kod kalmadığı için önce kapat, sonra uyarı.
 *  2. `proceedCheckout` — sipariş oluştu ama `checkoutGroupId`/`orderId` yok
 *     → SONLANDIRICI: sepet boşaltılıp /orders'a gidiliyor.
 *  3. `proceedCheckout` — ödeme başlatma (`initiateGroupGuest`) hatası
 *     → SONLANDIRICI: uyarının BUTONU ekranı terk ediyor.
 *  4. `proceedCheckout` — genel sipariş hatası (5xx / yönlendirilemeyen stok)
 *     → ENGELLEYİCİ ama sonlandırıcı DEĞİL: girilen OTP kodu hâlâ geçerli
 *       ("kod geçersiz" durumu bir üst dalda satır içi işleniyor), modalı
 *       kapatmak kullanıcıyı yeni kod istemeye zorlardı → satır içi göster.
 *
 * Ortak güvence: modal AÇIKKEN hiçbir yol `appAlert`'i çağırmaz.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { pushMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

/**
 * `appAlert` KAYNAĞINDA mock'lanır (`@/ui` barrel'ında değil): `alertAfterClose`
 * de aynı modülden import ediyor, barrel mock'lansaydı ertelenmiş uyarı gerçek
 * `appAlert`'e gider ve casus onu göremezdi.
 */
jest.mock('@/ui/components/AlertDialog', () => {
  const actual = jest.requireActual('@/ui/components/AlertDialog');
  return { ...actual, appAlert: jest.fn() };
});

jest.mock('@/components/common', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const actual = jest.requireActual('@/components/common');

  const MockCityDistrictSelector = ({ city, district, onChangeCity, onChangeDistrict }: any) => (
    <View>
      <TextInput
        testID="city-input"
        value={city}
        onChangeText={(v: string) => {
          onChangeCity(v);
          onChangeDistrict('');
        }}
      />
      <TextInput testID="district-input" value={district} onChangeText={onChangeDistrict} />
    </View>
  );

  const MockPhoneInput = ({ phone, onPhoneChange }: any) => (
    <TextInput testID="phone-input" value={phone} onChangeText={onPhoneChange} />
  );

  return { ...actual, CityDistrictSelector: MockCityDistrictSelector, PhoneInput: MockPhoneInput };
});

const QUOTE = {
  data: {
    pricingHash: 'hash-1',
    shippingTariffVersion: 3,
    items: [{ productId: 'prod-1234567890', quantity: 1, unitPrice: 100, subtotal: 100 }],
    pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
  },
};

jest.mock('@/lib/api', () => ({
  ordersApi: {
    checkout: jest.fn(),
    checkoutGuest: jest.fn(),
    sendGuestVerificationCode: jest.fn(),
    getQuote: jest.fn(),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: { validate: jest.fn(), validateGuest: jest.fn() },
  cartApi: { clear: jest.fn(() => Promise.resolve()) },
}));

import { appAlert } from '@/ui/components/AlertDialog';
import { ordersApi, paymentsApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const mocked = (fn: unknown) => fn as unknown as jest.Mock;

const SAMPLE_ITEM = {
  id: 'cart-1',
  productId: 'prod-1234567890',
  title: 'Test Model Araba',
  price: 100,
  quantity: 1,
  imageUrl: 'https://x/y.jpg',
  brand: 'Bburago',
  scale: '1:18',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: false, user: null });
    return sel ? sel(state) : state;
  },
}));

function fillAllStep1Fields() {
  fireEvent.changeText(screen.getAllByTestId('phone-input')[0]!, '5321234567');
  fireEvent.changeText(screen.getByTestId('city-input'), 'İstanbul');
  fireEvent.changeText(screen.getByTestId('district-input'), 'Kadıköy');
  fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Ali Veli');
  fireEvent.changeText(screen.getByTestId('guest-email-input'), 'ali@example.com');
  fireEvent.changeText(screen.getByTestId('shipping-fullname-input'), 'Ali Veli');
  fireEvent.changeText(screen.getByTestId('shipping-address-input'), 'Test Sokak No:1');
}

/** Misafir akışını adım 3'e sürükleyip OTP modalını açar. */
async function openOtpModal() {
  renderWithProviders(<CheckoutScreen />);
  await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
  fillAllStep1Fields();
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
  await act(async () => {
    fireEvent.press(screen.getByText(/Onayla ve Öde/));
  });
  await waitFor(() => expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen());
  // Modalı açan akış hiçbir uyarı basmamalı — testlerin başlangıç noktası temiz.
  expect(appAlert).not.toHaveBeenCalled();
}

async function submitOtp() {
  fireEvent.changeText(screen.getByTestId('guest-otp-input'), '123456');
  await act(async () => {
    fireEvent.press(screen.getByTestId('guest-otp-submit'));
  });
}

describe('OTP modalı açıkken ham appAlert kalmadı', () => {
  beforeEach(() => {
    resetRouterMocks();
    mocked(appAlert).mockClear();
    mocked(ordersApi.getQuote).mockReset().mockResolvedValue(QUOTE);
    mocked(ordersApi.checkoutGuest).mockReset();
    mocked(paymentsApi.initiateGroupGuest).mockReset();
    mocked(ordersApi.sendGuestVerificationCode)
      .mockReset()
      // expiresInSeconds: 0 → "Kodu tekrar gönder" hemen etkin (geri sayım yok).
      .mockResolvedValue({ data: { success: true, expiresInSeconds: 0 } });
    useCartStore.setState({ items: [SAMPLE_ITEM], lastUpdated: Date.now() });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('1 · kod yeniden gönderilirken 409 → modal ÖNCE kapanır, uyarı SONRA (sonlandırıcı)', async () => {
    await openOtpModal();
    mocked(ordersApi.sendGuestVerificationCode).mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Bu e-posta adresi zaten kayıtlı.' } },
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('guest-otp-resend'));
    });

    // Modal kapandı VE bu anda henüz uyarı basılmadı (donma tuzağı: sıralama).
    expect(screen.queryByTestId('guest-otp-input')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');

    // Modal tamamen kapandıktan sonra uyarı çıkar.
    await waitFor(
      () =>
        expect(appAlert).toHaveBeenCalledWith(
          'Bu e-posta zaten kayıtlı',
          'Bu e-posta adresi zaten kayıtlı.',
          undefined,
        ),
      { timeout: 2000 },
    );
  });

  it('2 · sipariş oluştu ama grup/sipariş id yok → modal ÖNCE kapanır (sonlandırıcı)', async () => {
    await openOtpModal();
    mocked(ordersApi.checkoutGuest).mockResolvedValue({ data: { data: {} } });

    await submitOtp();

    expect(screen.queryByTestId('guest-otp-input')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/orders');

    await waitFor(
      () =>
        expect(appAlert).toHaveBeenCalledWith(
          'Hata',
          'Sipariş oluşturuldu fakat ödeme başlatılamadı. Siparişlerim sayfasından devam edebilirsiniz.',
          undefined,
        ),
      { timeout: 2000 },
    );
  });

  it('3 · ödeme başlatılamadı → modal ÖNCE kapanır, uyarı butonuyla birlikte SONRA', async () => {
    await openOtpModal();
    mocked(ordersApi.checkoutGuest).mockResolvedValue({
      data: { data: { checkoutGroupId: 'grp-1', orders: [{ orderId: 'ord-1' }] } },
    });
    mocked(paymentsApi.initiateGroupGuest).mockRejectedValue({
      response: { status: 500, data: { message: 'PayTR şu anda yanıt vermiyor' } },
    });

    await submitOtp();

    expect(screen.queryByTestId('guest-otp-input')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();

    // Aksiyon butonu korundu (uyarı kullanıcıyı ekrandan çıkarıyor).
    await waitFor(
      () =>
        expect(appAlert).toHaveBeenCalledWith(
          'Ödeme Başlatılamadı',
          'PayTR şu anda yanıt vermiyor',
          expect.arrayContaining([expect.objectContaining({ text: 'Tamam' })]),
        ),
      { timeout: 2000 },
    );
  });

  it('4 · genel sipariş hatası → modal AÇIK kalır, mesaj modal İÇİNDE (engelleyici)', async () => {
    await openOtpModal();
    mocked(ordersApi.checkoutGuest).mockRejectedValue({
      response: { status: 500, data: { message: 'Sipariş servisi geçici olarak kullanılamıyor' } },
    });

    await submitOtp();

    // Ham uyarı YOK — mesaj modalın içinde, OTP oturumu ve girilen kod duruyor.
    expect(appAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen();
    expect(screen.getByTestId('guest-otp-input').props.value).toBe('123456');
    await waitFor(() =>
      expect(screen.getByText('Sipariş servisi geçici olarak kullanılamıyor')).toBeOnTheScreen(),
    );

    // Kod hâlâ geçerli: kullanıcı yeniden deneyebilir (yeni kod istemek zorunda değil).
    mocked(ordersApi.checkoutGuest).mockClear();
    await act(async () => {
      fireEvent.press(screen.getByTestId('guest-otp-submit'));
    });
    expect(ordersApi.checkoutGuest).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerificationCode: '123456' }),
    );
    // Yeniden denemede de ham uyarı basılmadı.
    expect(appAlert).not.toHaveBeenCalled();
  });
});
