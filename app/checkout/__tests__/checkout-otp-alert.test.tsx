/**
 * checkout-otp-alert · OTP modalı açıkken gelen quote/kupon uyarısı (bulgu I1).
 *
 * İki ayrı sorun vardı:
 *  1. `alertRespectingOtpModal` modal durumunu CLOSURE'dan okuyordu. React Query
 *     çalışan bir `queryFn`'i fetch'in BAŞLADIĞI render'ın closure'ıyla yürütür;
 *     kupon uygulanıp hemen "Onayla ve Öde"ye basılırsa gecikmiş quote 400'ü
 *     bayat `otpModalOpen=false` görüyordu → Modal AÇIKKEN `appAlert` → iOS donar.
 *     Artık durum `useRef` ile takip ediliyor.
 *  2. Modal açıkken uyarı `alertAfterClose` ile modalı KAPATIYORDU; kupon
 *     geçersizliği gibi GEÇİCİ bir olay yüzünden kullanıcı OTP oturumunu (ve
 *     aldığı kodu) kaybediyor, yeniden kod istemek zorunda kalıyordu.
 *     Artık uyarı ERTELENİYOR: modal açık kalır, uyarı modal kapanınca çıkar.
 *
 * Bu test 2'yi doğrudan doğrular (1'in davranışsal sonucu da budur: modal
 * açıkken HİÇBİR koşulda `appAlert` çağrılmaz).
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  return { ...actual, appAlert: jest.fn() };
});

jest.mock('@/components/common', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const actual = jest.requireActual('@/components/common');

  const MockCityDistrictSelector = ({
    city,
    district,
    onChangeCity,
    onChangeDistrict,
  }: any) => (
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

jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    checkout: jest.fn(),
    checkoutGuest: jest.fn(),
    sendGuestVerificationCode: jest.fn(() =>
      Promise.resolve({ data: { success: true, expiresInSeconds: 180 } }),
    ),
    // Kuponlu quote 400 döner (kupon arada geçersizleşmiş senaryosu).
    getQuote: jest.fn((data: any) =>
      data?.couponCode
        ? Promise.reject({ response: { status: 400, data: { message: 'Kupon kodu bulunamadı' } } })
        : Promise.resolve({
            data: {
              pricingHash: 'hash-no-coupon',
              shippingTariffVersion: 3,
              commissionRuleSetId: 'rs-1',
              commissionRuleSetVersion: 7,
              couponDiscount: 0,
              pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
            },
          }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: {
    validate: jest.fn(),
    validateGuest: jest.fn(() =>
      Promise.resolve({ data: { isValid: true, discount: { code: 'INDIRIM10', estimatedDiscount: 18 } } }),
    ),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: false, user: null });
    return sel ? sel(state) : state;
  },
}));

import { appAlert } from '@/ui';
import { ordersApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

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

function fillAllStep1Fields() {
  fireEvent.changeText(screen.getAllByTestId('phone-input')[0], '5321234567');
  fireEvent.changeText(screen.getByTestId('city-input'), 'İstanbul');
  fireEvent.changeText(screen.getByTestId('district-input'), 'Kadıköy');
  fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Ali Veli');
  fireEvent.changeText(screen.getByTestId('guest-email-input'), 'ali@example.com');
  fireEvent.changeText(screen.getByTestId('shipping-fullname-input'), 'Ali Veli');
  fireEvent.changeText(screen.getByTestId('shipping-address-input'), 'Test Sokak No:1');
}

/**
 * Mesafeli satış onayı (P2 #9) ödeme butonunu kapatıyor — her ödeme akışı
 * önce kutuyu işaretlemeli, tıpkı kullanıcının yaptığı gibi.
 */
function acceptDistanceSales() {
  const box = screen.queryByTestId('checkout-distance-sales-checkbox');
  if (box) fireEvent.press(box);
}

describe('OTP modalı açıkken kupon/quote uyarısı', () => {
  beforeEach(() => {
    jest.mocked(appAlert).mockClear();
    useCartStore.setState({ items: [SAMPLE_ITEM], lastUpdated: Date.now() });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('modal AÇIKKEN appAlert çağrılmaz (iOS donması), OTP oturumu korunur, uyarı modal kapanınca çıkar', async () => {
    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());

    // Adım 3'e ilerle ve OTP modalını aç.
    fillAllStep1Fields();
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
    acceptDistanceSales();
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });
    await waitFor(() => expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen());

    // Kullanıcı kodunu girmiş olsun — kaybolmamalı.
    fireEvent.changeText(screen.getByTestId('guest-otp-input'), '123456');

    // Modal AÇIKKEN kupon uygula → kuponlu quote 400 → kupon düşer.
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'indirim10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('coupon-apply-button'));
    });

    // Kupon gerçekten denendi ve düştü…
    await waitFor(() =>
      expect(ordersApi.getQuote).toHaveBeenCalledWith(expect.objectContaining({ couponCode: 'INDIRIM10' })),
    );
    await waitFor(() => expect(screen.queryByTestId('coupon-applied')).toBeNull());

    // …ama modal AÇIKKEN appAlert ÇAĞRILMADI (iOS'ta donma sebebi).
    expect(appAlert).not.toHaveBeenCalled();
    // Ve OTP oturumu bozulmadı: modal açık, girilen kod duruyor.
    expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen();
    expect(screen.getByTestId('guest-otp-input').props.value).toBe('123456');

    // Modal kapanınca ertelenen uyarı gösterilir.
    const RNModal = require('react-native').Modal;
    await act(async () => {
      fireEvent(screen.UNSAFE_getByType(RNModal), 'requestClose');
    });
    await waitFor(() => expect(screen.queryByTestId('guest-otp-input')).toBeNull());
    await waitFor(() =>
      expect(appAlert).toHaveBeenCalledWith('Kupon Geçersiz', 'Kupon kodu bulunamadı'),
    );
  });
});
