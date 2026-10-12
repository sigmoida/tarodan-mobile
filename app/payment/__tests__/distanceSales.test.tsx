/**
 * Ödeme ekranı → mesafeli satış onay kutusu ne zaman zorunlu (API delta 22 §3).
 *
 * API kapısı (`ensureForPayment`): tekil sipariş `origin ≠ platform_service` +
 * sepet grubu. Takas, üyelik, öne çıkarma kapı dışı. Sepet checkout'u onayı 3.
 * adımda aldığı için ondan gelen grup ödemesinde kutu tekrar sorulmaz; gruba
 * sonradan dönülürse (başarısız ödeme / Ödemelerim) web'deki gibi istenir.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
}));
// Üyelik/öne çıkarma yollarının kart formuna ulaşabildiği durum (Android, D2 öncesi).
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';

jest.mock('@/components/CardPaymentForm', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ requireDistanceSalesConsent }: any) =>
      React.createElement(Text, { testID: 'card-payment-form' }, `consent:${String(requireDistanceSalesConsent)}`),
  };
});
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import PaymentScreen from '../[id]';

const getStatusLightMock = paymentsApi.getStatusLight as jest.Mock;
const getStatusLightGuestMock = paymentsApi.getStatusLightGuest as jest.Mock;

async function consentShown(): Promise<string> {
  return (await screen.findByTestId('card-payment-form')).props.children as string;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'pay-1' };
  (paymentsApi.getConfig as jest.Mock).mockResolvedValue({ data: { bypassEnabled: false } });
});

it('teklif siparişi (sipariş detayından "Öde"): kutu ZORUNLU', async () => {
  mockParams = { id: 'pay-1', orderId: 'order-1', guest: '0' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:true');
});

it('sepet checkout\'undan gelen grup ödemesi (`groupId` param): kutu yok — onay 3. adımda alındı', async () => {
  mockParams = { id: 'pay-1', orderId: 'order-1', groupId: 'g-1', guest: '0' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
});

it('misafir checkout\'u da aynı', async () => {
  mockParams = { id: 'pay-1', orderId: 'order-1', groupId: 'g-1', guest: '1' };
  getStatusLightGuestMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
});

it('grup ödemesine sonradan dönüş (başarısız ödeme → tekrar dene): kutu ZORUNLU', async () => {
  mockParams = { id: 'pay-1', guest: '0' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:true');
});

it('takas nakit farkı: kutu yok', async () => {
  mockParams = { id: 'pay-1', tradeCash: '1', tradeId: 't-1' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', tradeId: 't-1', amount: 50 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
});

it('üyelik ve öne çıkarma (platform hizmeti): kutu yok', async () => {
  mockParams = { id: 'pay-1', type: 'membership' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-m', amount: 99 } });
  const first = renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
  first.unmount();

  mockParams = { id: 'pay-2', type: 'boost' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-b', amount: 49 } });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
});

it('üyelik, rota `type` olmadan (durum yanıtı `isMembershipOrder`): kutu yok', async () => {
  getStatusLightMock.mockResolvedValue({
    data: { status: 'pending', orderId: 'order-m', amount: 99, isMembershipOrder: true },
  });
  renderWithProviders(<PaymentScreen />);
  expect(await consentShown()).toBe('consent:false');
});
