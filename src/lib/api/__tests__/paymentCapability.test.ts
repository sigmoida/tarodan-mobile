/**
 * Misafir kart ödemesi 403 hatası: sunucu misafirde direct-form gövdesinde
 * `paymentId` VE `X-Payment-Capability` başlığı istiyor
 * (`payment-initiation.service.ts` → `resolveDirectPaymentContext`). Belirteç
 * `POST /payments/initiate[-guest]` yanıtındaki `paymentAccessToken` (web
 * `lib/api/payments.ts` aynası).
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
  },
  guestApi: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, guestApi } from '../client';
import { paymentsApi } from '../checkout';
import { buildDirectFormBody } from '@/lib/payment/directFormBody';
import { __resetPaymentCapabilities } from '@/lib/payment/paymentCapability';

const apiPost = api.post as jest.Mock;
const apiGet = api.get as jest.Mock;
const guestPost = guestApi.post as jest.Mock;
const guestGet = guestApi.get as jest.Mock;

const PAY = '7f9c2b1e-0000-4000-8000-000000000001';
const GROUP = '7f9c2b1e-0000-4000-8000-0000000000aa';
const CAP = { 'X-Payment-Capability': 'cap-token' };

beforeEach(async () => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
  await AsyncStorage.clear();
});

/** Arkada süren depo yazımının bitmesini bekle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function guestInitiate() {
  guestPost.mockResolvedValueOnce({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  await paymentsApi.initiateGroupGuest(GROUP);
}

it('misafir: initiate-guest belirtecini saklar; direct-form gövdede paymentId + başlıkta belirteç', async () => {
  await guestInitiate();

  const body = buildDirectFormBody({
    target: { checkoutGroupId: GROUP },
    paymentId: PAY,
    card: { kind: 'new', save: false },
    distanceSalesAccepted: true,
  });
  await paymentsApi.directForm(body);

  expect(apiPost).toHaveBeenCalledWith(
    '/payments/direct-form',
    { checkoutGroupId: GROUP, paymentId: PAY, saveCard: false, distanceSalesAccepted: true },
    { headers: CAP },
  );
});

it('misafir: durum, verify ve confirm-failed da belirteci taşır', async () => {
  await guestInitiate();
  await paymentsApi.getStatusLightGuest(PAY);
  await paymentsApi.getStatusLight(PAY);
  await paymentsApi.verify(PAY);
  await paymentsApi.confirmFailed(PAY);

  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
  expect(apiGet).toHaveBeenCalledWith(`/payments/${PAY}/status`, { headers: CAP });
  expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers: CAP });
  expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/confirm-failed`, {}, { headers: CAP });
});

it('`{ data: { ... } }` sarmalı yanıtta da belirteç okunur; üye initiate de saklar (web gibi)', async () => {
  apiPost.mockResolvedValueOnce({ data: { data: { paymentId: PAY, paymentAccessToken: 'cap-token' } } });
  await paymentsApi.initiate('order-1');
  await paymentsApi.directForm({ orderId: 'order-1', paymentId: PAY, saveCard: false });
  expect(apiPost).toHaveBeenLastCalledWith(
    '/payments/direct-form',
    { orderId: 'order-1', paymentId: PAY, saveCard: false },
    { headers: CAP },
  );
});

it('belirteç yoksa (ör. takas nakit farkı) başlık boş — üye kendi oturumuyla yetkili', async () => {
  await paymentsApi.directForm({ tradeId: 't-1', paymentId: PAY, saveCard: false });
  expect(apiPost).toHaveBeenCalledWith('/payments/direct-form', expect.anything(), { headers: {} });
  await paymentsApi.directForm({ tradeId: 't-1', saveCard: false });
  expect(apiPost).toHaveBeenLastCalledWith('/payments/direct-form', expect.anything(), { headers: {} });
});

it('`{ data: { ... } }` sarmalı yanıtta da belirteç okunur (initiate-guest, tek sipariş)', async () => {
  guestPost.mockResolvedValueOnce({ data: { data: { paymentId: PAY, paymentAccessToken: 'cap-token' } } });
  const res = (await paymentsApi.initiateGuest('order-1')) as { data: { data: { paymentId: string } } };
  expect(res.data.data.paymentId).toBe(PAY); // yanıt çağırana aynen döner
  await paymentsApi.getStatusLightGuest(PAY);
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
});

it('üye initiate de belirteci saklar (web gibi): durum, verify ve confirm-failed başlıklı', async () => {
  apiPost.mockResolvedValueOnce({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  const res = await paymentsApi.initiateGroup(GROUP);
  expect(apiPost).toHaveBeenLastCalledWith('/payments/initiate', { checkoutGroupId: GROUP, provider: 'paytr' });
  expect(res).toEqual({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } }); // yanıt aynen döner

  await paymentsApi.getStatusLight(PAY);
  await paymentsApi.verify(PAY);
  await paymentsApi.confirmFailed(PAY);
  expect(apiGet).toHaveBeenLastCalledWith(`/payments/${PAY}/status`, { headers: CAP });
  expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers: CAP });
  expect(apiPost).toHaveBeenLastCalledWith(`/payments/${PAY}/confirm-failed`, {}, { headers: CAP });
});

it('üye: belirteç dönmezse (eski API) istekler eskisi gibi başlıksız', async () => {
  apiPost.mockResolvedValueOnce({ data: { paymentId: PAY } });
  await paymentsApi.initiateGroup(GROUP);
  await paymentsApi.getStatusLight(PAY);
  await paymentsApi.verify(PAY);
  expect(apiGet).toHaveBeenLastCalledWith(`/payments/${PAY}/status`, { headers: {} });
  expect(apiPost).toHaveBeenLastCalledWith(`/payments/${PAY}/verify`, {}, { headers: {} });
});

it('belirteç başka ödemeye sızmaz', async () => {
  await guestInitiate();
  await paymentsApi.getStatusLightGuest('another-payment');
  expect(guestGet).toHaveBeenCalledWith('/payments/another-payment/status-guest', { headers: {} });
});

it('banka uygulamasında süreç ölse de: belirteç depoda, dönüşte durum/verify/confirm-failed başlıklı', async () => {
  await guestInitiate();
  await flush();
  expect(await AsyncStorage.getItem(`payment-capability.${PAY}`)).toContain('cap-token');

  __resetPaymentCapabilities(); // uygulama yeniden başladı: bellek boş
  await paymentsApi.getStatusLightGuest(PAY);
  await paymentsApi.verify(PAY);
  await paymentsApi.confirmFailed(PAY);
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
  expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers: CAP });
  expect(apiPost).toHaveBeenCalledWith(`/payments/${PAY}/confirm-failed`, {}, { headers: CAP });
});

it('depo yazımı başarısız olsa da initiate bozulmaz, aynı süreçte başlık gider', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await guestInitiate();
  await flush();
  await paymentsApi.getStatusLightGuest(PAY);
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
});
