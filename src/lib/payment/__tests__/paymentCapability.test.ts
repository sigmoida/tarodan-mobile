/**
 * Ödeme yetki belirteci deposu (`paymentCapability.ts`).
 */
import type { AxiosInstance } from 'axios';
import {
  __resetPaymentCapabilities,
  capabilityPaymentId,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
  withPaymentCapability,
} from '../paymentCapability';

const PAY = 'pay-1';
const CAP = { 'X-Payment-Capability': 'cap-token' };

beforeEach(() => {
  __resetPaymentCapabilities();
});

describe('zarf açma (unwrapEnvelope)', () => {
  it('düz gövde: { paymentId, paymentAccessToken }', async () => {
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('zarflı gövde: { data: { paymentId, paymentAccessToken } }', async () => {
    await rememberPaymentCapability({ data: { data: { paymentId: PAY, paymentAccessToken: 'cap-token' } } });
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it.each([
    ['yanıt yok', undefined],
    ['null gövde', { data: null }],
    ['belirteç yok', { data: { paymentId: PAY } }],
    ['belirteç metin değil', { data: { paymentId: PAY, paymentAccessToken: 42 } }],
    ['paymentId yok', { data: { paymentAccessToken: 'cap-token' } }],
  ])('%s → saklanmaz, fırlatmaz', async (_label, response) => {
    await rememberPaymentCapability(response); // fırlatmamalı
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });
});

describe('capabilityPaymentId', () => {
  it.each([
    ['/payments/pay-1/status', undefined, 'pay-1'],
    ['/payments/pay-1/status-guest', undefined, 'pay-1'],
    ['/payments/pay-1/verify', {}, 'pay-1'],
    ['/payments/pay-1/confirm-failed?x=1', {}, 'pay-1'],
    ['/payments/direct-form', { paymentId: 'pay-2', checkoutGroupId: 'g-1' }, 'pay-2'],
    ['/payments/direct-form', { checkoutGroupId: 'g-1' }, undefined],
    ['/payments/direct-form', { paymentId: '' }, undefined],
    ['/payments/direct-form', undefined, undefined],
    ['/payments/pay-1/verify', { paymentId: 'pay-2' }, 'pay-1'], // yol önce gelir
  ])('%s (%j) → %s', (url, body, expected) => {
    expect(capabilityPaymentId(url, body)).toBe(expected);
  });
});

describe('withPaymentCapability (ödeme API sarmalayıcısı)', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  const http = withPaymentCapability(client as unknown as Pick<AxiosInstance, 'get' | 'post'>);

  beforeEach(async () => {
    client.get.mockReset().mockResolvedValue({ data: { status: 'pending' } });
    client.post.mockReset().mockResolvedValue({ data: { ok: true } });
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  });

  it('GET /payments/:id/...: başlığı ekler, yanıtı aynen döner', async () => {
    const res = await http.get(`/payments/${PAY}/status`);
    expect(client.get).toHaveBeenCalledWith(`/payments/${PAY}/status`, { headers: CAP });
    expect(res).toEqual({ data: { status: 'pending' } });
  });

  it('POST /payments/:id/...: gövde aynen gider, başlık eklenir', async () => {
    await http.post(`/payments/${PAY}/verify`, {});
    expect(client.post).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers: CAP });
  });

  it('direct-form: id gövdedeki paymentId\'den okunur', async () => {
    const body = { checkoutGroupId: 'g-1', paymentId: PAY, saveCard: false };
    await http.post('/payments/direct-form', body);
    expect(client.post).toHaveBeenCalledWith('/payments/direct-form', body, { headers: CAP });
  });

  it('belirteç yoksa ya da başka ödemeyse başlık eklenmez', async () => {
    await http.get('/payments/other/status');
    await http.post('/payments/direct-form', { checkoutGroupId: 'g-1' });
    expect(client.get).toHaveBeenLastCalledWith('/payments/other/status', { headers: {} });
    expect(client.post).toHaveBeenLastCalledWith('/payments/direct-form', { checkoutGroupId: 'g-1' }, { headers: {} });
  });

  it('çağıranın config\'i ve başlıkları korunur', async () => {
    await http.get(`/payments/${PAY}/status`, { timeout: 5000, headers: { 'X-Trace': '1' } });
    expect(client.get).toHaveBeenCalledWith(`/payments/${PAY}/status`, {
      timeout: 5000,
      headers: { 'X-Trace': '1', ...CAP },
    });
  });

  it('istek hatası çağırana aynen iletilir', async () => {
    const err = Object.assign(new Error('403'), { response: { status: 403 } });
    client.post.mockRejectedValueOnce(err);
    await expect(http.post(`/payments/${PAY}/confirm-failed`, {})).rejects.toBe(err);
  });
});
