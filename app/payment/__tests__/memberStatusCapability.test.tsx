/**
 * Üye başarı/başarısız ekranları oturuma (JWT) bağlı olmasın.
 *
 * Eskiden üye durumu `GET /payments/:id` ile okunuyordu: uç `JwtAuthGuard`'lı,
 * yetki belirtecini kabul etmiyor. Oturum 3DS sırasında düşerse 401 → refresh
 * olmazsa çıkış → login ekranı; ödeme tamamlanmış olsa bile. Grup ve takas
 * ödemesinde de 400 dönüyordu (`findOne`: tekil sipariş yok).
 *
 * Artık üye de `GET /payments/:id/status` okur (web `usePaymentSuccess` gibi).
 * Sunucu (`payment.controller.ts` → `getPaymentStatus`): `@Public`; kullanıcıyı
 * elle çıkarır, token geçersizse `null` (401 YOK) ve
 * `getPaymentStatusUnified(id, userId, hasPaymentCapability(req, id))` ile
 * belirteç sahiplikten önce yetkilendirir.
 *
 * Gerçek `paymentsApi` + mock'lu axios: belirtecin tel üzerinde gittiği doğrulanır.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ paymentId: 'pay-1' }),
}));
jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  guestApi: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/lib/api', () => ({
  paymentsApi: jest.requireActual('@/lib/api/checkout').paymentsApi,
}));

import { api } from '@/lib/api/client';
import { paymentsApi } from '@/lib/api';
import { router } from 'expo-router';
import {
  __resetPaymentCapabilities,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
} from '@/lib/payment/paymentCapability';
import { __resetVerifyPacer } from '@/lib/payment/verifyPacer';
import PaymentSuccessScreen from '../success';
import PaymentFailScreen from '../fail';

const apiGet = api.get as jest.Mock;
const apiPost = api.post as jest.Mock;
const CAP = { 'X-Payment-Capability': 'cap-token' };
const unauthorized = () => Promise.reject(Object.assign(new Error('401'), { response: { status: 401 } }));

/** Oturum düştü: JWT'li uç 401; public `/status` yalnız belirteçle yanıt verir. */
function sessionDropped(status: string) {
  apiGet.mockImplementation((url: string, config?: { headers?: Record<string, string> }) => {
    if (url === '/payments/pay-1/status') {
      return config?.headers?.['X-Payment-Capability'] === 'cap-token'
        ? Promise.resolve({ data: { id: 'pay-1', status, amount: 350, checkoutGroupId: 'g-1', groupNumber: 'GRP-1' } })
        : Promise.reject(Object.assign(new Error('403'), { response: { status: 403 } }));
    }
    return unauthorized(); // GET /payments/:id (JwtAuthGuard)
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
  __resetVerifyPacer();
  // Üye initiate yanıtındaki belirteç (checkout'ta saklanır).
  await rememberPaymentCapability({ data: { paymentId: 'pay-1', paymentAccessToken: 'cap-token' } });
  apiPost.mockResolvedValue({ data: { completed: true, status: 'already_completed' } });
});

it('başarı ekranı (üye): durum belirteçle /status\'tan, JWT\'li GET /payments/:id hiç çağrılmaz', async () => {
  sessionDropped('completed');
  renderWithProviders(<PaymentSuccessScreen />);
  expect(await screen.findByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
  expect(screen.getByText('GRP-1')).toBeOnTheScreen();
  expect(apiGet).toHaveBeenCalledWith('/payments/pay-1/status', { headers: CAP });
  expect(apiGet).not.toHaveBeenCalledWith('/payments/pay-1');
});

it('başarısız ekranı (üye): confirm-failed ve durum belirteçle; JWT\'li uç çağrılmaz', async () => {
  sessionDropped('failed');
  renderWithProviders(<PaymentFailScreen />);
  await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/payments/pay-1/status', { headers: CAP }));
  expect(apiPost).toHaveBeenCalledWith('/payments/pay-1/confirm-failed', {}, { headers: CAP });
  expect(apiGet).not.toHaveBeenCalledWith('/payments/pay-1');
});

describe('kesin sonuçta yetki belirteci kaydı silinir', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('başarı ekranı: ödeme tamamlandı → durum okunduktan sonra kayıt silinir', async () => {
    sessionDropped('completed');
    renderWithProviders(<PaymentSuccessScreen />);
    expect(await screen.findByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
    await waitFor(async () => expect(await paymentCapabilityHeaders('pay-1')).toEqual({}));
  });

  it('başarı ekranı: hâlâ pending → kayıt kalır (ödemeye dönüş için)', async () => {
    jest.useFakeTimers();
    sessionDropped('pending');
    apiPost.mockResolvedValue({ data: { completed: false, status: 'process_skipped' } });
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(20_000); // 5 deneme + uçuştaki verify
    expect(apiGet).toHaveBeenCalledTimes(5);
    expect(await paymentCapabilityHeaders('pay-1')).toEqual(CAP);
  });

  it('başarısız ekranı: failed kesin DEĞİL → confirm-failed ve durum okunduktan sonra kayıt KALIR', async () => {
    sessionDropped('failed');
    renderWithProviders(<PaymentFailScreen />);
    expect(await screen.findByText('Tekrar Dene')).toBeOnTheScreen();
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/payments/pay-1/status', { headers: CAP }));
    expect(apiPost).toHaveBeenCalledWith('/payments/pay-1/confirm-failed', {}, { headers: CAP });
    expect(await paymentCapabilityHeaders('pay-1')).toEqual(CAP);
  });

  it('başarısız ekranı → Tekrar Dene → aynı paymentId ile ikinci deneme belirteci taşır', async () => {
    // Sunucu `retryPayment` aynı satırı failed → pending yapar, yeni belirteç vermez.
    sessionDropped('failed');
    renderWithProviders(<PaymentFailScreen />);
    fireEvent.press(await screen.findByText('Tekrar Dene'));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/payment/[id]', params: expect.objectContaining({ id: 'pay-1' }) }),
      ),
    );
    expect(apiPost).toHaveBeenCalledWith('/payments/pay-1/retry');

    // Kart formunun ikinci denemesi: direct-form ve durum okuması aynı belirteçle.
    apiPost.mockClear();
    apiGet.mockClear();
    await paymentsApi.directForm({ orderId: 'order-1', paymentId: 'pay-1' });
    await paymentsApi.getStatusLight('pay-1');
    expect(apiPost).toHaveBeenCalledWith(
      '/payments/direct-form',
      { orderId: 'order-1', paymentId: 'pay-1' },
      { headers: CAP },
    );
    expect(apiGet).toHaveBeenCalledWith('/payments/pay-1/status', { headers: CAP });
  });
});
