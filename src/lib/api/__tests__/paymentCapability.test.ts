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

beforeEach(() => {
  jest.clearAllMocks();
  __resetPaymentCapabilities();
});

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

it('belirteç başka ödemeye sızmaz', async () => {
  await guestInitiate();
  await paymentsApi.getStatusLightGuest('another-payment');
  expect(guestGet).toHaveBeenCalledWith('/payments/another-payment/status-guest', { headers: {} });
});
