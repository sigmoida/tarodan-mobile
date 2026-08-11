/**
 * checkout-phone-payload · "alana yazılan telefon sipariş payload'ına ne olarak
 * gidiyor" — EKRAN seviyesinde, misafir ve üye yolları ayrı ayrı.
 *
 * REGRESYON (iki katman):
 *  1. `formatPhoneNumber` fazla haneyi sessizce KIRPIYORDU → `05321234567890`
 *     alanda `532 123 45 67` görünüyor, payload'a `+905321234567` gidiyordu:
 *     kullanıcı bir şey kaybettiğini anlamıyor, kurye ULAŞILAMAZ numaraya
 *     çıkıyordu. (Ayrıştırıcı `79e6848`'te sıkılaştı.)
 *  2. Ayrıştırıcı düzeldikten sonra checkout hata SINIFINI değiştirdi ama
 *     kapatmadı: `normalizePhoneForPayload` geçersizde `''` döndürüyor, adım 1
 *     doğrulaması `≥10 hane` saydığı için üç bozuk girdiyi de geçiriyordu →
 *     sunucuya BOŞ telefon gidiyor, kullanıcı ham bir 400 görüyordu.
 *
 * Burada çivilenen: geçersiz numarada `ordersApi.checkoutGuest` / `checkout`
 * HİÇ çağrılmaz ve kullanıcı Türkçe sebebi görür; geçerli numarada payload
 * `+905321234567` taşır.
 *
 * `PhoneInput` bilerek GERÇEK bırakıldı (mock'lanan yalnız il/ilçe seçici):
 * test edilen şey tam olarak onun formatlaması + `validateOnBlur` doğrulaması.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders, makeTestQueryClient } from '@/test-utils';
import { appAlert } from '@/ui';
import { PHONE_INVALID_MESSAGE } from '@/utils/phone';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

// İl/ilçe seçici iki modal listesi — telefonla ilgisi yok, düz TextInput'a inar.
jest.mock('@/components/common', () => {
  const actual = jest.requireActual('@/components/common');
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const MockCityDistrictSelector = ({ city, district, onChangeCity, onChangeDistrict }: any) => (
    <View>
      <TextInput testID="city-input" value={city} onChangeText={onChangeCity} />
      <TextInput testID="district-input" value={district} onChangeText={onChangeDistrict} />
    </View>
  );
  return { ...actual, CityDistrictSelector: MockCityDistrictSelector };
});

const SAVED_ADDRESS = {
  id: 'addr-1',
  title: 'Ev',
  fullName: 'Ali Veli',
  phone: '+905321234567',
  city: 'İstanbul',
  district: 'Kadıköy',
  address: 'Test Sokak No:1',
  isDefault: true,
};

jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    checkout: jest.fn(() =>
      Promise.resolve({ data: { data: { checkoutGroupId: 'g1', orders: [{ orderId: 'o1' }] } } }),
    ),
    checkoutGuest: jest.fn(() =>
      Promise.resolve({ data: { data: { checkoutGroupId: 'g1', orders: [{ orderId: 'o1' }] } } }),
    ),
    sendGuestVerificationCode: jest.fn(() =>
      Promise.resolve({ data: { success: true, expiresInSeconds: 180 } }),
    ),
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: '70a8bdadff29af70',
          shippingTariffVersion: 3,
          commissionRuleSetId: 'rs-1',
          commissionRuleSetVersion: 7,
          pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
        },
      }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(() => Promise.resolve({ data: { data: { useBypass: true, paymentId: 'p1' } } })),
    initiateGroupGuest: jest.fn(() => Promise.resolve({ data: { data: { useBypass: true, paymentId: 'p1' } } })),
    bypassComplete: jest.fn(() => Promise.resolve({ data: {} })),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: { validate: jest.fn(), validateGuest: jest.fn() },
  cartApi: { clear: jest.fn(() => Promise.resolve()) },
}));

// Tek dosyada hem misafir hem üye yolu — jest.mock factory'si hoist edildiği için
// değişken adı `mock` ile başlamak ZORUNDA.
const mockAuthState: { isAuthenticated: boolean; user: any } = { isAuthenticated: false, user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

import { ordersApi, addressesApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useCheckout } from '../_hooks/useCheckout';
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

const seedCart = () => useCartStore.setState({ items: [SAMPLE_ITEM], lastUpdated: Date.now() });

/** Telefon dışındaki adres alanlarını doldurur (telefon çağıran tarafından verilir). */
const fillAddressExceptPhone = () => {
  fireEvent.changeText(screen.getByTestId('shipping-fullname-input'), 'Ali Veli');
  fireEvent.changeText(screen.getByTestId('shipping-address-input'), 'Test Sokak No:1');
  fireEvent.changeText(screen.getByTestId('city-input'), 'İstanbul');
  fireEvent.changeText(screen.getByTestId('district-input'), 'Kadıköy');
};

/** Adım 1 → 2 → 3; son adımda "Onayla ve Öde" görünür olana kadar bekler. */
const advanceToConfirm = async () => {
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
};

beforeEach(() => {
  jest.mocked(ordersApi.checkout).mockClear();
  jest.mocked(ordersApi.checkoutGuest).mockClear();
  jest.mocked(ordersApi.sendGuestVerificationCode).mockClear();
  jest.mocked(addressesApi.getAll).mockResolvedValue({ data: [] } as any);
  seedCart();
});

afterEach(() => {
  useCartStore.setState({ items: [] });
});

/**
 * Mesafeli satış onayı (P2 #9) ödeme butonunu kapatıyor — her ödeme akışı
 * önce kutuyu işaretlemeli, tıpkı kullanıcının yaptığı gibi.
 */
function acceptDistanceSales() {
  const box = screen.queryByTestId('checkout-distance-sales-checkbox');
  if (box) fireEvent.press(box);
}

describe('Misafir yolu — alana yazılan telefon payloada ne olarak gidiyor', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
  });

  const fillGuestStep1 = (guestPhone: string, shippingPhone = '') => {
    fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Ali Veli');
    fireEvent.changeText(screen.getByTestId('guest-email-input'), 'ali@example.com');
    fireEvent.changeText(screen.getByTestId('guest-phone-input'), guestPhone);
    fillAddressExceptPhone();
    // Boş bırakılırsa teslimat telefonu misafir telefonuna düşer (fallback).
    if (shippingPhone) fireEvent.changeText(screen.getByTestId('shipping-phone-input'), shippingPhone);
  };

  it('geçerli "0532 123 45 67" → checkoutGuest payloadı "+905321234567" taşır', async () => {
    renderWithProviders(<CheckoutScreen />);
    fillGuestStep1('0532 123 45 67');
    await advanceToConfirm();

    acceptDistanceSales();
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });
    await waitFor(() => expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('guest-otp-input'), '123456');
    await act(async () => {
      fireEvent.press(screen.getByTestId('guest-otp-submit'));
    });

    await waitFor(() => expect(ordersApi.checkoutGuest).toHaveBeenCalledTimes(1));
    const payload = jest.mocked(ordersApi.checkoutGuest).mock.calls[0]![0] as any;
    // İki kaynak da aynı numarayı taşır: iletişim telefonu VE kargo adresi telefonu.
    expect(payload.phone).toBe('+905321234567');
    expect(payload.shippingAddress.phone).toBe('+905321234567');
  });

  it.each([
    ['00905321234567'],
    ['+1 415 555 0100'],
    ['05321234567890'],
    ['0432 123 45 67'],
  ])('geçersiz "%s" → checkoutGuest HİÇ çağrılmaz, Türkçe hata görünür', async (input) => {
    renderWithProviders(<CheckoutScreen />);
    fillGuestStep1(input);

    fireEvent.press(screen.getByText('Devam Et'));

    // Adım 1'de kalınır: kargo adımı hiç açılmaz.
    expect(await screen.findByText(PHONE_INVALID_MESSAGE)).toBeOnTheScreen();
    expect(screen.queryByText('Kargo Seçimi')).toBeNull();
    expect(ordersApi.sendGuestVerificationCode).not.toHaveBeenCalled();
    expect(ordersApi.checkoutGuest).not.toHaveBeenCalled();
  });

  it('misafir telefonu geçerli ama TESLİMAT adresi telefonu geçersiz → gönderim durur', async () => {
    renderWithProviders(<CheckoutScreen />);
    fillGuestStep1('0532 123 45 67', '05321234567890');

    fireEvent.press(screen.getByText('Devam Et'));

    // Ayrı mesaj: hangi adresin telefonu reddedildi, kullanıcı görsün.
    expect(await screen.findByText(`Teslimat adresi — ${PHONE_INVALID_MESSAGE}`)).toBeOnTheScreen();
    expect(screen.queryByText('Kargo Seçimi')).toBeNull();
    expect(ordersApi.sendGuestVerificationCode).not.toHaveBeenCalled();
  });

  it('alan KIRPMAZ + blurda hata görünür, düzeltilince kalkar', async () => {
    renderWithProviders(<CheckoutScreen />);
    const input = screen.getByTestId('guest-phone-input');

    fireEvent.changeText(input, '05321234567890');
    // Kırpma olsaydı burada "532 123 45 67" görünür, 890 sessizce kaybolurdu.
    expect(input.props.value).toBe('05321234567890');
    expect(screen.queryByText(PHONE_INVALID_MESSAGE)).toBeNull(); // yazarken cezalandırma yok

    fireEvent(input, 'blur');
    expect(await screen.findByText(PHONE_INVALID_MESSAGE)).toBeOnTheScreen();

    fireEvent.changeText(input, '0532 123 45 67');
    await waitFor(() => expect(screen.queryByText(PHONE_INVALID_MESSAGE)).toBeNull());
  });

  it('telefon BOŞ ise "geçersiz" değil "gerekli" denir', async () => {
    renderWithProviders(<CheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Ali Veli');
    fireEvent.changeText(screen.getByTestId('guest-email-input'), 'ali@example.com');
    fillAddressExceptPhone();

    fireEvent.press(screen.getByText('Devam Et'));

    expect(await screen.findByText('Lütfen telefon numaranızı girin')).toBeOnTheScreen();
    expect(ordersApi.sendGuestVerificationCode).not.toHaveBeenCalled();
  });
});

describe('Üye yolu — telefon payloada ne olarak gidiyor', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'u1', email: 'member@example.com' };
  });

  it('KAYITLI adres seçili → payload adres ID gönderir, telefon uydurulmaz', async () => {
    jest.mocked(addressesApi.getAll).mockResolvedValue({ data: [SAVED_ADDRESS] } as any);
    renderWithProviders(<CheckoutScreen />);

    await waitFor(() => expect(screen.getByText('Ali Veli · +905321234567')).toBeOnTheScreen());
    await advanceToConfirm();

    acceptDistanceSales();
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0]![0] as any;
    expect(payload.shippingAddressId).toBe('addr-1');
    // Inline adres HİÇ gönderilmez — telefon sunucudaki kayıttan okunur.
    expect(payload.shippingAddress).toBeUndefined();
  });

  it('YENİ (inline) adres + geçerli telefon → payload "+905321234567" taşır', async () => {
    renderWithProviders(<CheckoutScreen />);

    fillAddressExceptPhone();
    fireEvent.changeText(screen.getByTestId('shipping-phone-input'), '0532 123 45 67');
    await advanceToConfirm();

    acceptDistanceSales();
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0]![0] as any;
    expect(payload.shippingAddress.phone).toBe('+905321234567');
    expect(payload.shippingAddressId).toBeUndefined();
  });

  it.each([['00905321234567'], ['+1 415 555 0100'], ['05321234567890'], ['0432 123 45 67']])(
    'YENİ (inline) adres + geçersiz "%s" → ordersApi.checkout HİÇ çağrılmaz',
    async (input) => {
      renderWithProviders(<CheckoutScreen />);

      fillAddressExceptPhone();
      fireEvent.changeText(screen.getByTestId('shipping-phone-input'), input);
      fireEvent.press(screen.getByText('Devam Et'));

      expect(await screen.findByText(`Teslimat adresi — ${PHONE_INVALID_MESSAGE}`)).toBeOnTheScreen();
      expect(screen.queryByText('Kargo Seçimi')).toBeNull();
      expect(ordersApi.checkout).not.toHaveBeenCalled();
    },
  );
});

/**
 * İKİNCİ katman: adım 1 doğrulaması atlansa bile `proceedCheckout` telefonu
 * `setLoading(true)`'dan ÖNCE çözer. Ekranı sürerek buraya ulaşılamıyor (her
 * ileri geçiş yeniden doğruluyor) — bu yüzden controller doğrudan sürülüyor.
 */
describe('proceedCheckout telefon kapısı — gönderim setLoading ÖNCESİ durur', () => {
  const renderCheckoutHook = () => {
    const queryClient = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useCheckout(), { wrapper });
  };

  it('çözülemeyen misafir telefonu → checkoutGuest çağrılmaz, uyarı basılır, loading açılmaz', async () => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;

    const { result } = renderCheckoutHook();
    await waitFor(() => expect(result.current.total).toBe(165));

    act(() => {
      result.current.setGuestName('Ali Veli');
      result.current.setGuestEmail('ali@example.com');
      result.current.setGuestPhone('05321234567890');
      result.current.setShippingAddress({
        fullName: 'Ali Veli',
        phone: '',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Test Sokak No:1',
      });
      result.current.setOtpCode('123456');
    });

    await act(async () => {
      await result.current.handleOtpSubmit();
    });

    expect(ordersApi.checkoutGuest).not.toHaveBeenCalled();
    expect(appAlert).toHaveBeenCalledWith('Telefon Numarası Geçersiz', PHONE_INVALID_MESSAGE);
    // Mesaj numarayı BASMAZ (PII uyarıya/log'a sızmasın).
    expect(JSON.stringify(jest.mocked(appAlert).mock.calls)).not.toContain('5321234567890');
    // `setLoading(true)` hiç çalışmadı.
    expect(result.current.loading).toBe(false);
  });

  it('çözülemeyen inline TESLİMAT telefonu (üye) → ordersApi.checkout çağrılmaz', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'u1', email: 'member@example.com' };

    const { result } = renderCheckoutHook();
    await waitFor(() => expect(result.current.total).toBe(165));

    act(() => {
      result.current.setShippingAddress({
        fullName: 'Ali Veli',
        phone: '0432 123 45 67',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Test Sokak No:1',
      });
    });

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(ordersApi.checkout).not.toHaveBeenCalled();
    expect(appAlert).toHaveBeenCalledWith(
      'Telefon Numarası Geçersiz',
      `Teslimat adresi — ${PHONE_INVALID_MESSAGE}`,
    );
    expect(result.current.loading).toBe(false);
  });
});
