/**
 * Ödeme ekranı → mesafeli satış onay kutusu (web `PaymentReady` paritesi).
 *
 * Web `/payment/[id]` hedefi olan HER ödemede kutuyu gösterir, işaretlenmeden
 * "Ödeme Yap"ı kapalı tutar ve `distanceSalesAccepted`'ı direct-form gövdesine
 * koyar (takas nakit farkı dahil). Checkout'tan dönülen sepet grubunda da kutu
 * yeniden sorulur — mobilin eski `groupId` kısayolu kaldırıldı. Üyelik/öne
 * çıkarma dijital satış kapalıyken bu ekrana hiç ulaşmaz (`/membership`
 * yönlendirmesi, `purpose.test.tsx`); açık olduğu yolda da web gibi kutu var.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

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
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
  },
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
}));
import { paymentsApi } from '@/lib/api';

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: () => React.createElement(View, { testID: 'paytr-webview' }),
    WebViewNavigation: {},
  };
});
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import PaymentScreen from '../[id]';

const getStatusLightMock = paymentsApi.getStatusLight as jest.Mock;
const getStatusLightGuestMock = paymentsApi.getStatusLightGuest as jest.Mock;
const directFormMock = paymentsApi.directForm as jest.Mock;

const BOX = 'payment-distance-sales-checkbox';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'pay-1' };
  (paymentsApi.getConfig as jest.Mock).mockResolvedValue({ data: { bypassEnabled: false } });
  directFormMock.mockResolvedValue({
    data: { paymentId: 'pay-1', action: PAYTR_ACTION, method: 'POST', fields: [{ name: 'merchant_id', value: '1' }] },
  });
});

async function expectBoxGatesPay() {
  expect(await screen.findByTestId(BOX)).toBeOnTheScreen();
  expect(screen.getByTestId('card-submit')).toBeDisabled();
}

it('teklif siparişi: kutu var, işaretlenmeden "Ödeme Yap" kapalı', async () => {
  mockParams = { id: 'pay-1', guest: '0' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  await expectBoxGatesPay();
});

it('checkout\'tan dönülen sepet grubu (`groupId` param): kutu YENİDEN sorulur (web gibi)', async () => {
  mockParams = { id: 'pay-1', orderId: 'order-1', groupId: 'g-1', guest: '0' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  await expectBoxGatesPay();
});

it('misafir sepet grubu: kutu var', async () => {
  mockParams = { id: 'pay-1', orderId: 'order-1', groupId: 'g-1', guest: '1' };
  getStatusLightGuestMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 500 } });
  renderWithProviders(<PaymentScreen />);
  await expectBoxGatesPay();
});

it('takas nakit farkı: kutu var ve onay gövdeye gider', async () => {
  mockParams = { id: 'pay-1', tradeCash: '1', tradeId: 't-1' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', tradeId: 't-1', amount: 50 } });
  renderWithProviders(<PaymentScreen />);
  await expectBoxGatesPay();

  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId(BOX));
  await waitFor(() => expect(screen.getByTestId('card-submit')).not.toBeDisabled());
  fireEvent.press(screen.getByTestId('card-submit'));

  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toEqual({
    tradeId: 't-1',
    paymentId: 'pay-1',
    saveCard: false,
    distanceSalesAccepted: true,
  });
});

it('üyelik (dijital satış açık yolu): web gibi kutu var', async () => {
  mockParams = { id: 'pay-1', type: 'membership' };
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-m', amount: 99 } });
  renderWithProviders(<PaymentScreen />);
  await expectBoxGatesPay();
});
