/**
 * Misafir kart ödemesi 403 hatası (OTA backport): sunucu misafirde direct-form
 * gövdesinde `paymentId` VE `X-Payment-Capability` başlığı istiyor
 * (`payment-initiation.service.ts`: `!userId && (!dto.paymentId || !capabilityAuthorized)`);
 * `status-guest`, `verify`, `confirm-failed` da `hasPaymentCapability(req, id)` ile
 * yetkileniyor. Belirteç `POST /payments/initiate-guest` yanıtındaki
 * `paymentAccessToken` (web `lib/api/payments.ts` aynası).
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
  expect(guestPost).toHaveBeenCalledWith('/payments/initiate-guest', { checkoutGroupId: GROUP, provider: 'paytr' });

  await paymentsApi.directForm({ checkoutGroupId: GROUP, paymentId: PAY, saveCard: false });

  expect(apiPost).toHaveBeenCalledWith(
    '/payments/direct-form',
    { checkoutGroupId: GROUP, paymentId: PAY, saveCard: false },
    { headers: CAP },
  );
});

it('misafir: status-guest, verify ve confirm-failed da belirteci taşır', async () => {
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

it('`{ data: { ... } }` sarmalı yanıtta da belirteç okunur (initiate-guest, tek sipariş)', async () => {
  guestPost.mockResolvedValueOnce({ data: { data: { paymentId: PAY, paymentAccessToken: 'cap-token' } } });
  const res = (await paymentsApi.initiateGuest('order-1')) as { data: { data: { paymentId: string } } };
  expect(res.data.data.paymentId).toBe(PAY); // yanıt çağırana aynen döner
  await paymentsApi.getStatusLightGuest(PAY);
  expect(guestGet).toHaveBeenCalledWith(`/payments/${PAY}/status-guest`, { headers: CAP });
});

it('üye yolu etkilenmez: initiate belirteç saklamaz, gövde ve başlıklar boş kalır', async () => {
  apiPost.mockResolvedValueOnce({ data: { paymentId: PAY, paymentAccessToken: 'member-token' } });
  await paymentsApi.initiateGroup(GROUP);
  expect(apiPost).toHaveBeenLastCalledWith('/payments/initiate', { checkoutGroupId: GROUP, provider: 'paytr' });

  await paymentsApi.directForm({ checkoutGroupId: GROUP, saveCard: false });
  expect(apiPost).toHaveBeenLastCalledWith(
    '/payments/direct-form',
    { checkoutGroupId: GROUP, saveCard: false },
    { headers: {} },
  );
  await paymentsApi.getStatusLight(PAY);
  await paymentsApi.verify(PAY);
  expect(apiGet).toHaveBeenLastCalledWith(`/payments/${PAY}/status`, { headers: {} });
  expect(apiPost).toHaveBeenLastCalledWith(`/payments/${PAY}/verify`, {}, { headers: {} });
});

it('belirteç başka ödemeye sızmaz', async () => {
  await guestInitiate();
  await paymentsApi.getStatusLightGuest('another-payment');
  await paymentsApi.directForm({ checkoutGroupId: GROUP, paymentId: 'another-payment', saveCard: false });
  expect(guestGet).toHaveBeenCalledWith('/payments/another-payment/status-guest', { headers: {} });
  expect(apiPost).toHaveBeenLastCalledWith('/payments/direct-form', expect.anything(), { headers: {} });
});
