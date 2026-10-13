/**
 * direct-form gövdesinde `paymentId` her zaman (web `useCardPayment` gibi).
 *
 * Sunucu (`payment-initiation.service.ts` → `resolveDirectPaymentContext`):
 *  - misafir: `!userId && (!dto.paymentId || !capabilityAuthorized)` → 403;
 *    gövdede `paymentId` + başlıkta belirteç zorunlu.
 *  - üye, belirteç yok: `!userId` kapısı geçilir, `paymentId` yok sayılır.
 *  - üye, belirteç var: hedefin (sipariş/grup/takas) bu ödemeye ait olduğu doğrulanır.
 *    Ödeme ekranı hedefi ödemenin kendi durumundan türettiği için eşleşir.
 *
 * Üye regresyonu: gövdeye `paymentId` girmesi ödemeyi aynı sonuca götürmeli
 * (3DS → yoklama → başarı).
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
import { membershipApi } from '@/lib/api';
import { __resetPaymentCapabilities, rememberPaymentCapability } from '@/lib/payment/paymentCapability';
import CardPaymentForm from '../CardPaymentForm';

const apiPost = api.post as jest.Mock;
const apiGet = api.get as jest.Mock;
const guestGet = guestApi.get as jest.Mock;
const listCards = membershipApi.listCards as jest.Mock;

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
  fireEvent.press(screen.getByTestId('card-submit'));
}

const directFormCall = () => apiPost.mock.calls.find(([url]) => url === '/payments/direct-form');

beforeEach(() => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
  apiPost.mockImplementation((url: string) =>
    url === '/payments/direct-form'
      ? Promise.resolve({ data: signed })
      : Promise.resolve({ data: { completed: true, status: 'completed' } }),
  );
  apiGet.mockResolvedValue({ data: { status: 'completed' } });
  guestGet.mockResolvedValue({ data: { status: 'completed' } });
});

afterEach(() => {
  jest.useRealTimers();
});

it('misafir: gövdede paymentId, başlıkta belirteç', async () => {
  await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={jest.fn()} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(directFormCall()).toBeTruthy());
  expect(directFormCall()).toEqual([
    '/payments/direct-form',
    { checkoutGroupId: 'g-1', paymentId: PAY, saveCard: false },
    { headers: CAP },
  ]);
});

describe.each([
  ['belirteç yok (sunucu paymentId\'yi yok sayar)', false, {}],
  ['belirteç var (üye initiate\'ten)', true, CAP],
])('üye, %s', (_label, hasToken, headers) => {
  it('gövdede paymentId; ödeme aynı sonuca gider (3DS → yoklama → başarı)', async () => {
    if (hasToken) await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    jest.useFakeTimers();
    const onSuccess = jest.fn();
    const onFail = jest.fn();
    renderWithProviders(
      <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} paymentId={PAY} onSuccess={onSuccess} onFail={onFail} />,
    );
    fillCardAndSubmit();
    await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
    expect(directFormCall()).toEqual([
      '/payments/direct-form',
      { checkoutGroupId: 'g-1', paymentId: PAY, saveCard: false },
      { headers },
    ]);

    await jest.advanceTimersByTimeAsync(3000);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
    expect(onFail).not.toHaveBeenCalled();
    expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers });
    expect(apiGet).toHaveBeenCalledWith(`/payments/${PAY}/status`, { headers });
    expect(guestGet).not.toHaveBeenCalled();
  });
});

it('üye, paymentId bilinmiyorsa gövde eskisi gibi (paymentId yok)', async () => {
  renderWithProviders(<CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />);
  fillCardAndSubmit();
  await waitFor(() => expect(directFormCall()).toBeTruthy());
  expect(directFormCall()?.[1]).toEqual({ orderId: 'order-1', saveCard: false });
});

it('üye, kayıtlı kart: gövdede paymentId + savedCardId', async () => {
  listCards.mockResolvedValueOnce({
    data: [{ id: 'card-1', last4: '4242', brand: 'visa', expMonth: '12', expYear: '30', requireCvv: false, isDefault: true, autoRenewEligible: true }],
  });
  apiPost.mockImplementation((url: string) =>
    url === '/payments/direct-form'
      ? Promise.resolve({ data: { ...signed, savedCard: true, requireCvv: false } })
      : Promise.resolve({ data: {} }),
  );
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} paymentId={PAY} recurringEnabled onSuccess={jest.fn()} />,
  );
  await waitFor(() => expect(screen.getByText(/4242/)).toBeTruthy());
  fireEvent.press(screen.getByTestId('card-submit'));
  await waitFor(() => expect(directFormCall()).toBeTruthy());
  expect(directFormCall()?.[1]).toEqual({ checkoutGroupId: 'g-1', paymentId: PAY, savedCardId: 'card-1' });
});
