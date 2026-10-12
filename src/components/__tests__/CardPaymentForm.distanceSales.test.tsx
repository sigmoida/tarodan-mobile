/**
 * Teklif siparişi ödemesinde mesafeli satış onayı (API delta 22 §3).
 *
 * Teklif siparişinin checkout adımı yok: onay yalnız direct-form gövdesinde
 * (`distanceSalesAccepted`) gidebilir. Sunucu `distance_sales_consent_required`
 * açıkken kayıtsız + onaysız satın almayı `400 server.consent.distanceSalesRequired`
 * ile reddeder. Web: `PaymentReady` — kutu işaretlenmeden "Ödeme Yap" kapalı.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  },
  membershipApi: { listCards: jest.fn() },
}));
import { paymentsApi, membershipApi } from '@/lib/api';

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: () => React.createElement(View, { testID: 'paytr-webview' }),
    WebViewNavigation: {},
  };
});

import CardPaymentForm from '../CardPaymentForm';

const directFormMock = paymentsApi.directForm as jest.Mock;
const listCardsMock = membershipApi.listCards as jest.Mock;

const signed = {
  paymentId: 'pay-9',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [{ name: 'merchant_id', value: '1' }],
};

function fillNewCard() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
}

beforeEach(() => {
  jest.clearAllMocks();
  directFormMock.mockResolvedValue({ data: signed });
});

it('onay zorunlu: kutu işaretlenmeden ödeme düğmesi kapalı, istek GİTMEZ', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'offer-order-1' }} requireDistanceSalesConsent onSuccess={jest.fn()} />,
  );
  fillNewCard();
  const pay = screen.getByTestId('card-submit');
  expect(pay).toBeDisabled();
  fireEvent.press(pay);
  await new Promise((r) => setTimeout(r, 0));
  expect(directFormMock).not.toHaveBeenCalled();
});

it('onay verilince gövdede `distanceSalesAccepted: true` (yeni kart)', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'offer-order-1' }} requireDistanceSalesConsent onSuccess={jest.fn()} />,
  );
  fillNewCard();
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  await waitFor(() => expect(screen.getByTestId('card-submit')).not.toBeDisabled());
  fireEvent.press(screen.getByTestId('card-submit'));

  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toEqual({
    orderId: 'offer-order-1',
    saveCard: false,
    distanceSalesAccepted: true,
  });
});

it('kayıtlı kartla da onay gövdede', async () => {
  listCardsMock.mockResolvedValue({
    data: [
      {
        id: 'c-shop', last4: '1111', brand: 'Visa', expMonth: '12', expYear: '30',
        requireCvv: false, isDefault: true, autoRenewEligible: false, purpose: 'checkout',
      },
    ],
  });
  renderWithProviders(
    <CardPaymentForm
      target={{ orderId: 'offer-order-1' }}
      purpose="checkout"
      cardStorageEnabled
      requireDistanceSalesConsent
      onSuccess={jest.fn()}
    />,
  );
  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));

  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toEqual({
    orderId: 'offer-order-1',
    savedCardId: 'c-shop',
    distanceSalesAccepted: true,
  });
});

it('onayı geri alınca düğme yeniden kapanır', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o' }} requireDistanceSalesConsent onSuccess={jest.fn()} />,
  );
  const box = screen.getByTestId('payment-distance-sales-checkbox');
  fireEvent.press(box);
  await waitFor(() => expect(screen.getByTestId('card-submit')).not.toBeDisabled());
  fireEvent.press(box);
  await waitFor(() => expect(screen.getByTestId('card-submit')).toBeDisabled());
});

it('onay gerekmiyorsa (takas / üyelik / checkout\'tan gelen grup) kutu yok, alan gönderilmez', async () => {
  renderWithProviders(<CardPaymentForm target={{ tradeId: 't-1' }} onSuccess={jest.fn()} />);
  expect(screen.queryByTestId('payment-distance-sales-checkbox')).toBeNull();
  fillNewCard();
  fireEvent.press(screen.getByTestId('card-submit'));
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  const body = directFormMock.mock.calls[0][0];
  expect(body).toEqual({ tradeId: 't-1', saveCard: false });
  expect(body).not.toHaveProperty('distanceSalesAccepted');
});
