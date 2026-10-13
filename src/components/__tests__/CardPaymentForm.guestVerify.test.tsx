/**
 * Misafir 3DS / timeout yoklamasında `verify` (para akışı).
 *
 * Sunucu misafirin verify'ını `X-Payment-Capability` ile kabul ediyor
 * (`payment.controller.ts` → `verifyPayment`: `capabilityAuthorized:
 * hasPaymentCapability(req, id)`; `payment-lifecycle.service.ts` →
 * `assertPaymentAccess` capability'yi sahiplikten önce geçirir). Yoklama verify'ı
 * misafirde atlarsa callback gecikince ödeme PayTR'de tamamlanmış olsa bile
 * pending kalır.
 *
 * Gerçek `paymentsApi` + mock'lu axios istemcisi: başlığın tel üzerinde gittiği
 * de doğrulanır. Misafirin verify ve direct-form istekleri `guestApi`'den gider
 * (Bearer yok, 401'de çıkış yok); `api` misafirde hiç kullanılmaz.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  guestApi: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/lib/api', () => ({
  paymentsApi: jest.requireActual('@/lib/api/checkout').paymentsApi,
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
}));

jest.mock('react-native-webview', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return {
    WebView: () => React.createElement(View, { testID: 'paytr-webview' }),
    WebViewNavigation: {},
  };
});

import { api, guestApi } from '@/lib/api/client';
import { __resetPaymentCapabilities, rememberPaymentCapability } from '@/lib/payment/paymentCapability';
import { __resetVerifyPacer, VERIFY_TIMEOUT_MS } from '@/lib/payment/verifyPacer';
import CardPaymentForm from '../CardPaymentForm';

const apiPost = api.post as jest.Mock;
const apiGet = api.get as jest.Mock;
const guestPost = guestApi.post as jest.Mock;
const guestGet = guestApi.get as jest.Mock;

const PAY = 'pay-1';
const CAP = { 'X-Payment-Capability': 'cap-token' };
const signed = {
  paymentId: PAY,
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [{ name: 'merchant_id', value: '12345' }],
};

function fillCardAndSubmit() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  // Mesafeli satış onayı her ödemede zorunlu (A2, web `PaymentReady`).
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));
}

const verifyCalls = () => guestPost.mock.calls.filter(([url]) => url === `/payments/${PAY}/verify`);

/** Misafir akışında `api` (Bearer ekleyen, 401'de çıkış yaptıran) hiç kullanılmadı. */
const expectNoAuthenticatedClient = () => {
  expect(apiPost).not.toHaveBeenCalled();
  expect(apiGet).not.toHaveBeenCalled();
};

beforeEach(async () => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
  __resetVerifyPacer();
  // initiate-guest yanıtındaki belirteç (checkout'ta saklanır).
  await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  guestPost.mockImplementation((url: string) =>
    url === '/payments/direct-form'
      ? Promise.resolve({ data: signed })
      : Promise.resolve({ data: { completed: true, status: 'completed' } }),
  );
  guestGet.mockResolvedValue({ data: { status: 'completed' } });
});

afterEach(() => {
  jest.useRealTimers();
});

it('misafir 3DS yoklaması: verify başlıkla turun başında arkada başlar (beklenmez), ödendiyse başarı', async () => {
  jest.useFakeTimers();
  const onSuccess = jest.fn();
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={onSuccess} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  expect(verifyCalls()).toHaveLength(0);

  await jest.advanceTimersByTimeAsync(3000);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));

  expect(guestPost).toHaveBeenCalledWith('/payments/direct-form', expect.objectContaining({ paymentId: PAY }), { headers: CAP });
  expect(guestPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { timeout: VERIFY_TIMEOUT_MS, headers: CAP });
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
  const verifyOrder = guestPost.mock.invocationCallOrder[guestPost.mock.calls.findIndex(([u]) => u === `/payments/${PAY}/verify`)];
  expect(verifyOrder).toBeLessThan(guestGet.mock.invocationCallOrder[0]);
  expectNoAuthenticatedClient();
});

it('misafir direct-form zaman aşımı: bilinen paymentId ile verify (başlıklı) + status-guest', async () => {
  guestPost.mockImplementation((url: string) =>
    url === '/payments/direct-form'
      ? Promise.reject(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }))
      : Promise.resolve({ data: { completed: true, status: 'completed' } }),
  );
  jest.useFakeTimers();
  const onSuccess = jest.fn();
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={onSuccess} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(guestPost).toHaveBeenCalledWith('/payments/direct-form', expect.anything(), expect.anything()));

  await jest.advanceTimersByTimeAsync(3000);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
  expect(guestPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { timeout: VERIFY_TIMEOUT_MS, headers: CAP });
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
  expectNoAuthenticatedClient();
});

it('verify hata verse de (ör. 429) yoklama status-guest ile sürer', async () => {
  guestPost.mockImplementation((url: string) =>
    url === '/payments/direct-form'
      ? Promise.resolve({ data: signed })
      : Promise.reject(Object.assign(new Error('throttled'), { response: { status: 429 } })),
  );
  jest.useFakeTimers();
  const onSuccess = jest.fn();
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={onSuccess} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());

  await jest.advanceTimersByTimeAsync(3000);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
  expect(verifyCalls()).toHaveLength(1);
});
