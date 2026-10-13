/**
 * Misafir kart ödemesi 403 (OTA backport): misafirde direct-form gövdesinde
 * `paymentId` olmalı (sunucu `X-Payment-Capability` belirtecini bu id'ye karşı
 * doğrular). Üye gövdesi değişmemeli.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
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

import CardPaymentForm from '../CardPaymentForm';

const directFormMock = paymentsApi.directForm as jest.Mock;

function fillCardAndSubmit() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId('card-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  directFormMock.mockResolvedValue({
    data: {
      paymentId: 'pay-1',
      action: PAYTR_ACTION,
      method: 'POST',
      fields: [{ name: 'merchant_id', value: '12345' }],
    },
  });
});

it('misafir: gövdede paymentId (yoksa sunucu 403 döner)', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId="pay-1" onSuccess={jest.fn()} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toEqual({ checkoutGroupId: 'g-1', paymentId: 'pay-1', saveCard: false });
});

it('üye: gövde değişmez (paymentId prop verilse de gönderilmez)', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} paymentId="pay-1" onSuccess={jest.fn()} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toEqual({ checkoutGroupId: 'g-1', saveCard: false });
});
