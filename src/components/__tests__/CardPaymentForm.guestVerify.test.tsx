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

import { api, guestApi } from '@/lib/api/client';
import { __resetPaymentCapabilities, rememberPaymentCapability } from '@/lib/payment/paymentCapability';
import {
  __resetVerifyPacer,
  PAYMENT_POLL_DURATION_MS,
  VERIFY_LOOP_INTERVAL_MS,
  VERIFY_TIMEOUT_MS,
} from '@/lib/payment/verifyPacer';
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

/** 3DS: PayTR → banka (ACS) → PayTR. Kullanıcı bankada onayladı, PayTR sonucu işliyor. */
function bankPageThenBackToPaytr() {
  mockWebViewNav?.({ url: PAYTR_ACTION });
  mockWebViewNav?.({ url: 'https://acs.examplebank.com.tr/3ds/challenge' });
  mockWebViewNav?.({ url: 'https://www.paytr.com/odeme/guvenli/sonuc' });
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

it('misafir 3DS yoklaması: verify başlıkla ~3 sn\'de arkada başlar, durum okunur, ödendiyse başarı', async () => {
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

describe('verify temposu 3DS aşamasından bağımsız (sabit aralık)', () => {
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
    return Date.now();
  }
  /** Verify gönderim anları (sahte saat). */
  let verifyAt: number[];
  const verifySeconds = (start: number) => verifyAt.map((t) => (t - start) / 1000);
  beforeEach(() => {
    verifyAt = [];
    const impl = guestPost.getMockImplementation()!;
    guestPost.mockImplementation((url: string, ...rest: unknown[]) => {
      if (url === `/payments/${PAY}/verify`) verifyAt.push(Date.now());
      return impl(url, ...rest);
    });
  });

  it('banka sayfası hiç görünmese de (Non3D, frictionless, iframe ACS) verify ~3 sn\'de başlar', async () => {
    await open3DS();
    await jest.advanceTimersByTimeAsync(2999);
    expect(verifyCalls()).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(verifyCalls()).toHaveLength(1);
  });

  it('110 sn süren 3DS: verify 10 sn\'de bir düzenli sürer; dönüşten sonra da aynı tempo, yoklama 120 sn\'de bitmez', async () => {
    const start = await open3DS();
    await jest.advanceTimersByTimeAsync(110_000);
    expect(verifySeconds(start)).toEqual([3, 13, 23, 33, 43, 53, 63, 73, 83, 93, 103]);
    bankPageThenBackToPaytr(); // kullanıcı 110. sn'de bankada onayladı
    await jest.advanceTimersByTimeAsync(40_000);
    expect(verifySeconds(start).slice(-4)).toEqual([113, 123, 133, 143]);
    const seconds = verifySeconds(start);
    seconds.slice(1).forEach((sec, i) => expect(sec - seconds[i]).toBe(VERIFY_LOOP_INTERVAL_MS / 1000));
    // Durum her 3 sn okunmaya devam ediyor (eski 40 denemelik sınır 120. sn'de bitiyordu).
    expect(guestGet).toHaveBeenCalledTimes(50);
  });

  it('yoklama 4 dk sürer, sonra durur (verify de)', async () => {
    await open3DS();
    await jest.advanceTimersByTimeAsync(PAYMENT_POLL_DURATION_MS);
    expect(guestGet).toHaveBeenCalledTimes(PAYMENT_POLL_DURATION_MS / 3000);
    const verifies = verifyCalls().length;
    await jest.advanceTimersByTimeAsync(60_000);
    expect(guestGet).toHaveBeenCalledTimes(PAYMENT_POLL_DURATION_MS / 3000);
    expect(verifyCalls()).toHaveLength(verifies);
  });
});
