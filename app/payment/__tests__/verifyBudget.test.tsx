/**
 * Verify sıklığı ve sırası — kart formu yoklaması + başarı ekranı birlikte.
 *
 * Sunucu `POST /payments/:id/verify` için dakikada 10 istek sınırı uyguluyor
 * (`payment.controller.ts` → `verifyPayment` `@Throttle({ limit: 10, ttl: 60000 })`)
 * ve her çağrıda PayTR'yi sorguluyor. Eskiden yoklama her 3 sn'de verify'ı
 * BEKLEYİP sonra durumu okuyordu: 429'lar ve yavaş verify'da gecikmiş durum.
 *
 * Doğrulananlar (misafir ve üye):
 *  - Herhangi bir 60 sn pencerede verify sayısı ≤ sunucu sınırı (kart formu +
 *    ardından açılan başarı ekranının çağrıları toplam).
 *  - Durum okuması verify'ı beklemez: verify hiç yanıt vermese de durum her
 *    3 sn'de okunur ve sonuç bildirilir.
 *
 * Gerçek `paymentsApi` + mock'lu axios istemcisi.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
}));
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
import {
  __resetVerifyPacer,
  VERIFY_SERVER_LIMIT_PER_MIN,
  VERIFY_WINDOW_MS,
} from '@/lib/payment/verifyPacer';
import CardPaymentForm from '@/components/CardPaymentForm';
import PaymentSuccessScreen from '../success';

const PAY = 'pay-1';
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

const maxPerWindow = (times: number[]) =>
  Math.max(0, ...times.map((t) => times.filter((u) => u >= t && u < t + VERIFY_WINDOW_MS).length));

describe.each([
  ['misafir', true, guestApi, `/payments/${PAY}/status-guest`],
  ['üye', false, api, `/payments/${PAY}/status`],
])('%s', (_label, isGuest, client, statusUrl) => {
  const post = client.post as jest.Mock;
  const get = client.get as jest.Mock;
  let verifyAt: number[];
  let statusAt: number[];
  let status: () => string;
  let verifyReply: () => Promise<unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetPaymentCapabilities();
    __resetVerifyPacer();
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    verifyAt = [];
    statusAt = [];
    status = () => 'pending';
    verifyReply = () => Promise.resolve({ data: { completed: false, status: 'process_skipped' } });
    post.mockImplementation((url: string) => {
      if (url === '/payments/direct-form') return Promise.resolve({ data: signed });
      if (url === `/payments/${PAY}/verify`) {
        verifyAt.push(Date.now());
        return verifyReply();
      }
      return Promise.resolve({ data: {} });
    });
    get.mockImplementation((url: string) => {
      if (url === statusUrl) statusAt.push(Date.now());
      return Promise.resolve({ data: { id: PAY, status: status(), amount: 100 } });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function startPolling(onSuccess = jest.fn()) {
    renderWithProviders(
      <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} isGuest={isGuest} paymentId={PAY} onSuccess={onSuccess} />,
    );
    fillCardAndSubmit();
    await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
    return { onSuccess, start: Date.now() };
  }

  it('durum okuması verify\'ı beklemez: verify hiç yanıt vermese de durum her 3 sn\'de okunur', async () => {
    verifyReply = () => new Promise(() => undefined); // PayTR sorgusu asılı
    const { start } = await startPolling();

    await jest.advanceTimersByTimeAsync(30_000);
    // 10 tur, her biri 3 sn'de: verify'ın asılı kalması durumu geciktirmedi.
    expect(statusAt.map((t) => (t - start) / 1000)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
  });

  it('verify asılıyken ödeme tamamlanınca ilk turda başarı bildirilir', async () => {
    verifyReply = () => new Promise(() => undefined);
    status = () => 'completed';
    const { onSuccess } = await startPolling();

    await jest.advanceTimersByTimeAsync(3000);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
    expect(verifyAt).toHaveLength(1); // turun başında arkada başlatıldı
  });

  it('120 sn yoklama (40 tur): her 60 sn pencerede verify ≤ sunucu sınırı; durum 40 kez okunur', async () => {
    await startPolling();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(statusAt).toHaveLength(40);
    expect(maxPerWindow(verifyAt)).toBeLessThanOrEqual(VERIFY_SERVER_LIMIT_PER_MIN);
  });

  it('kart formu ~57 sn yoklar, ardından başarı ekranı: toplam verify her 60 sn pencerede ≤ sınır', async () => {
    const { onSuccess, start } = await startPolling();
    // Ödeme 57. sn'de kesinleşir (kart formu bunu görür); başarı ekranı yine de
    // durum "pending" okuyup 5 deneme yapar — en kötü durum.
    status = () => (Date.now() - start >= 57_000 && !onSuccess.mock.calls.length ? 'completed' : 'pending');
    await jest.advanceTimersByTimeAsync(57_000);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
    screen.unmount();

    mockParams = { paymentId: PAY, ...(isGuest ? { guest: '1' } : {}) };
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(30_000);

    expect(verifyAt.length).toBeGreaterThan(6); // başarı ekranı da verify gönderdi
    expect(maxPerWindow(verifyAt)).toBeLessThanOrEqual(VERIFY_SERVER_LIMIT_PER_MIN);
  });
});
