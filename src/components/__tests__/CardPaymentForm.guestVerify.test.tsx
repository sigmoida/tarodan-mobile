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

/** WebView'in son `onNavigationStateChange`'i: 3DS gezinmesini (banka → PayTR) taklit etmek için. */
let mockWebViewNav: ((nav: { url: string }) => void) | undefined;
jest.mock('react-native-webview', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return {
    WebView: (props: { onNavigationStateChange?: (nav: { url: string }) => void }) => {
      mockWebViewNav = props.onNavigationStateChange;
      return React.createElement(View, { testID: 'paytr-webview' });
    },
    WebViewNavigation: {},
  };
});

import { AppState } from 'react-native';
import { api, guestApi } from '@/lib/api/client';
import { __resetPaymentCapabilities, rememberPaymentCapability } from '@/lib/payment/paymentCapability';
import { __resetVerifyPacer, VERIFY_DURING_3DS_INTERVAL_MS, VERIFY_TIMEOUT_MS } from '@/lib/payment/verifyPacer';
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
  fireEvent.press(screen.getByTestId('card-submit'));
}

const verifyCalls = () => guestPost.mock.calls.filter(([url]) => url === `/payments/${PAY}/verify`);

/** 3DS: PayTR → banka (ACS) → PayTR. Kullanıcı bankada onayladı, PayTR sonucu işliyor. */
function bankPageThenBackToPaytr() {
  mockWebViewNav?.({ url: PAYTR_ACTION });
  mockWebViewNav?.({ url: 'https://acs.examplebank.com.tr/3ds/challenge' });
  mockWebViewNav?.({ url: 'https://www.paytr.com/odeme/guvenli/sonuc' });
}

/** Kullanıcı banka uygulamasından döndü (uygulama arka plandan öne geldi). */
function backFromBankApp() {
  const listeners = (AppState.addEventListener as jest.Mock).mock.calls.filter(([event]) => event === 'change');
  const listener = listeners[listeners.length - 1][1] as (state: string) => void;
  listener('background');
  listener('active');
}

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

it('misafir 3DS yoklaması: kullanıcı 3DS\'ten dönünce verify başlıkla turun başında arkada başlar, ödendiyse başarı', async () => {
  jest.useFakeTimers();
  const onSuccess = jest.fn();
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={onSuccess} />,
  );
  fillCardAndSubmit();
  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  expect(verifyCalls()).toHaveLength(0);
  bankPageThenBackToPaytr();

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
  backFromBankApp();

  await jest.advanceTimersByTimeAsync(3000);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
  expect(verifyCalls()).toHaveLength(1);
});

describe('3DS sürerken verify seyrek, erken faz kullanıcı dönünce başlar', () => {
  beforeEach(() => {
    guestGet.mockResolvedValue({ data: { status: 'pending' } });
  });

  async function open3DS() {
    jest.useFakeTimers();
    renderWithProviders(
      <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest paymentId={PAY} onSuccess={jest.fn()} />,
    );
    fillCardAndSubmit();
    await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  }

  it('dönüş yokken: durum her 3 sn okunur, verify yalnız 30 sn\'de bir', async () => {
    await open3DS();
    await jest.advanceTimersByTimeAsync(VERIFY_DURING_3DS_INTERVAL_MS - 1000);
    expect(guestGet).toHaveBeenCalledTimes(9);
    expect(verifyCalls()).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1000);
    expect(verifyCalls()).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(VERIFY_DURING_3DS_INTERVAL_MS - 3000);
    expect(verifyCalls()).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(3000);
    expect(verifyCalls()).toHaveLength(2);
  });

  it('WebView bankadan PayTR\'ye dönünce sonraki turlarda verify gider (erken faz)', async () => {
    await open3DS();
    await jest.advanceTimersByTimeAsync(12_000);
    expect(verifyCalls()).toHaveLength(0);
    bankPageThenBackToPaytr();
    await jest.advanceTimersByTimeAsync(9000);
    expect(verifyCalls()).toHaveLength(3); // 15, 18, 21. sn
  });

  it('yalnız PayTR sayfası (banka sayfası görülmeden) dönüş sayılmaz', async () => {
    await open3DS();
    mockWebViewNav?.({ url: PAYTR_ACTION });
    mockWebViewNav?.({ url: 'https://www.paytr.com/odeme/guvenli/form' });
    await jest.advanceTimersByTimeAsync(12_000);
    expect(verifyCalls()).toHaveLength(0);
  });

  it('banka uygulamasından dönüş (arka plan → ön plan) erken fazı başlatır; inactive → active başlatmaz', async () => {
    await open3DS();
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.filter(([event]) => event === 'change');
    const listener = listeners[listeners.length - 1][1] as (state: string) => void;
    listener('inactive'); // ör. bildirim merkezi
    listener('active');
    await jest.advanceTimersByTimeAsync(6000);
    expect(verifyCalls()).toHaveLength(0);
    backFromBankApp();
    await jest.advanceTimersByTimeAsync(3000);
    expect(verifyCalls()).toHaveLength(1);
  });
});
