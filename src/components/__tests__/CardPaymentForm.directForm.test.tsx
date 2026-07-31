/**
 * CardPaymentForm — direct-form akışı. Kart verisi KENDİ API'mize gitmez:
 * directForm gövdesinde kart alanı olmamalı; kart alanları yalnız WebView'e
 * verilen HTML içinde bulunur.
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

let lastWebViewSource: any = null;
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: any) => {
      lastWebViewSource = props.source;
      return React.createElement(View, { testID: 'paytr-webview' });
    },
    WebViewNavigation: {},
  };
});

// appAlert zaten jest.setup.ts'te global jest.fn() olarak mock'lanıyor (@/ui);
// burada ayrıca mock'lamıyoruz — setup'taki beforeEach mockReset ile çakışır.
import { appAlert as mockAlert } from '@/ui';

import CardPaymentForm from '../CardPaymentForm';

const signedResponse = {
  paymentId: 'pay-9',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [
    { name: 'merchant_id', value: '12345' },
    { name: 'payment_amount', value: '462.81' },
    { name: 'non_3d', value: '0' },
  ],
};

async function fillCardAndSubmit() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId('card-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  lastWebViewSource = null;
});

it('directForm gövdesine kart verisi KOYMAZ', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({ data: signedResponse });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(paymentsApi.directForm).toHaveBeenCalled());
  const body = (paymentsApi.directForm as jest.Mock).mock.calls[0][0];
  const serialized = JSON.stringify(body).toLowerCase();
  for (const forbidden of ['card_number', 'cc_owner', 'cvv', 'cvc', 'expiry_month', '4111']) {
    expect(serialized).not.toContain(forbidden);
  }
  expect(body).toEqual({ orderId: 'order-1', saveCard: false });
});

it('imzalı alanları ve kart alanlarını içeren HTML ile WebView açar', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({ data: signedResponse });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  const html = lastWebViewSource?.html as string;
  expect(html).toContain(`action="${PAYTR_ACTION}"`);
  expect(html).toContain('name="merchant_id"');
  expect(html).toContain('value="462.81"');
  expect(html).toContain('name="card_number"');
  expect(html).toContain('value="4111111111111111"');
});

it('action beklenmedikse WebView açmaz ve kullanıcıyı uyarır', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({
    data: { ...signedResponse, action: 'https://evil.example/odeme' },
  });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  expect(screen.queryByTestId('paytr-webview')).toBeNull();
});

it('3DS açıkken Vazgeç: sert başarısız saymaz, durum sorgulaması devreye girer ve ödendiyse başarı bildirir', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({ data: signedResponse });
  (paymentsApi.getStatusLight as jest.Mock).mockResolvedValue({
    data: { status: 'completed' },
  });
  const onSuccess = jest.fn();
  const onFail = jest.fn();
  jest.useFakeTimers();
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={onSuccess} onFail={onFail} />,
  );
  await fillCardAndSubmit();
  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());

  fireEvent.press(screen.getByTestId('threeds-cancel'));

  // WebView kapanır ama Vazgeç, ödemeyi "başarısız" olarak bildirmez.
  expect(screen.queryByTestId('paytr-webview')).toBeNull();
  expect(onFail).not.toHaveBeenCalled();

  // Poll/verify güvenlik ağı devreye girer (setTimeout 3000ms) ve gerçek durumu doğrular.
  await jest.advanceTimersByTimeAsync(3000);
  await waitFor(() => expect(paymentsApi.getStatusLight).toHaveBeenCalledWith('pay-9'));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('pay-9'));
  expect(onFail).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it('sunucudan ham kart alanı gelirse akışı iptal eder', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({
    data: { ...signedResponse, fields: [{ name: 'card_number', value: 'x' }] },
  });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  expect(screen.queryByTestId('paytr-webview')).toBeNull();
});
