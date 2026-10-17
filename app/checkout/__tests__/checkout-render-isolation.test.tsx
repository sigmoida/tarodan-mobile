/**
 * checkout-render-isolation · Performans kilidi.
 *
 * - Misafir ad/e-posta/telefon RHF'de: tuş vuruşu checkout controller'ını (`useCheckout`)
 *   yeniden çalıştırmaz.
 * - Adres alanına yazmak da controller'ı çalıştırmaz (değer adres deposunda, yaprak abone) ve
 *   memo'lu özet kartı yeniden çizilmez.
 * - OTP kodu ve saniyelik geri sayım modalın içinde: controller'ı yeniden çalıştırmaz.
 */
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

type Setter = (v: string) => void;

jest.mock('@/components/common', () => {
  const { View, TextInput } = jest.requireActual('react-native');
  const actual = jest.requireActual('@/components/common');
  const MockCityDistrictSelector = ({
    city,
    district,
    onChangeCity,
    onChangeDistrict,
  }: { city: string; district: string; onChangeCity: Setter; onChangeDistrict: Setter }) => (
    <View>
      <TextInput testID="city-input" value={city} onChangeText={onChangeCity} />
      <TextInput testID="district-input" value={district} onChangeText={onChangeDistrict} />
    </View>
  );
  const MockPhoneInput = ({ phone, onPhoneChange }: { phone: string; onPhoneChange: Setter }) => (
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
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: 'h',
          shippingTariffVersion: 3,
          commissionRuleSetId: 'rs-1',
          commissionRuleSetVersion: 7,
          pricing: {
            summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 },
          },
        },
      }),
    ),
  },
  paymentsApi: {},
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: { validate: jest.fn() },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { isAuthenticated: boolean; user: null }) => unknown) => {
    const state = { isAuthenticated: false, user: null };
    return sel ? sel(state) : state;
  },
}));

let mockControllerRuns = 0;
jest.mock('../_hooks/useCheckout', () => {
  const actual = jest.requireActual('../_hooks/useCheckout');
  return {
    ...actual,
    useCheckout: () => {
      mockControllerRuns += 1;
      return actual.useCheckout();
    },
  };
});

let mockSummaryRenders = 0;
jest.mock('@/components/orders/OrderSummaryLines', () => {
  const actual = jest.requireActual('@/components/orders/OrderSummaryLines');
  return {
    ...actual,
    OrderSummaryLines: (props: Record<string, unknown>) => {
      mockSummaryRenders += 1;
      return actual.OrderSummaryLines(props);
    },
  };
});

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

describe('checkout — yazarken render yalıtımı', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [SAMPLE_ITEM], lastUpdated: Date.now() });
  });
  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('misafir alanları controller\'ı, adres alanı özet kartını yeniden çizmez', async () => {
    renderWithProviders(<CheckoutScreen />);
    // Quote yüklenene dek bekle (özet ilk karede "—" ile çizilir, sonra tutarla).
    await waitFor(() => expect(screen.getAllByText(/165,00/).length).toBeGreaterThan(0));

    const runs = mockControllerRuns;
    const summary = mockSummaryRenders;
    fireEvent.changeText(screen.getByTestId('guest-name-input'), 'A');
    fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Al');
    fireEvent.changeText(screen.getByTestId('guest-email-input'), 'a@b.co');
    fireEvent.changeText(screen.getAllByTestId('phone-input')[0], '532');
    expect(mockControllerRuns).toBe(runs);
    expect(screen.getByTestId('guest-name-input').props.value).toBe('Al');

    // Adres alanı depoda: controller çalışmaz, özet kartı yeniden çizilmez; alan güncellenir.
    fireEvent.changeText(screen.getByTestId('shipping-fullname-input'), 'Ali');
    expect(mockControllerRuns).toBe(runs);
    expect(mockSummaryRenders).toBe(summary);
    expect(screen.getByTestId('shipping-fullname-input').props.value).toBe('Ali');
  });

  it('OTP kodu ve geri sayım controller\'ı yeniden çalıştırmaz', async () => {
    renderWithProviders(<CheckoutScreen />);
    // Quote yüklenene dek bekle (özet ilk karede "—" ile çizilir, sonra tutarla).
    await waitFor(() => expect(screen.getAllByText(/165,00/).length).toBeGreaterThan(0));

    fireEvent.changeText(screen.getAllByTestId('phone-input')[0], '5321234567');
    fireEvent.changeText(screen.getByTestId('city-input'), 'İstanbul');
    fireEvent.changeText(screen.getByTestId('district-input'), 'Kadıköy');
    fireEvent.changeText(screen.getByTestId('guest-name-input'), 'Ali Veli');
    fireEvent.changeText(screen.getByTestId('guest-email-input'), 'ali@example.com');
    fireEvent.changeText(screen.getByTestId('shipping-fullname-input'), 'Ali Veli');
    fireEvent.changeText(screen.getByTestId('shipping-address-input'), 'Test Sokak No:1');
    fireEvent.press(screen.getByTestId('checkout-distance-sales-checkbox'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('checkout-pay-button'));
    });
    await waitFor(() => expect(screen.getByTestId('guest-otp-input')).toBeOnTheScreen());
    // Modal metni gönderim anındaki e-postayı gösterir.
    expect(screen.getByText(/ali@example\.com/)).toBeOnTheScreen();

    const runs = mockControllerRuns;
    fireEvent.changeText(screen.getByTestId('guest-otp-input'), '12');
    fireEvent.changeText(screen.getByTestId('guest-otp-input'), '123');
    expect(screen.getByTestId('guest-otp-input').props.value).toBe('123');

    expect(screen.getByText('Tekrar gönder (180s)')).toBeOnTheScreen();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    // Geri sayım ilerledi (modal içinde) ama controller yeniden çalışmadı.
    expect(screen.getByText('Tekrar gönder (179s)')).toBeOnTheScreen();
    expect(mockControllerRuns).toBe(runs);
  });
});
