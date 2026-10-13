/**
 * Ödeme yetki belirteci deposu (`paymentCapability.ts`).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosInstance } from 'axios';
import {
  __resetPaymentCapabilities,
  capabilityPaymentId,
  PAYMENT_CAPABILITY_TTL_MS,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
  withPaymentCapability,
} from '../paymentCapability';

const PAY = 'pay-1';
const KEY = `payment-capability.${PAY}`;
const CAP = { 'X-Payment-Capability': 'cap-token' };
const T0 = Date.UTC(2026, 9, 13, 9, 0, 0);

/** Uygulama yeniden başladı: bellek boş, AsyncStorage duruyor. */
const restartApp = () => __resetPaymentCapabilities();

beforeEach(async () => {
  __resetPaymentCapabilities();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
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

describe('kalıcılık (AsyncStorage, 2 saat TTL)', () => {
  const nowAt = (t: number) => jest.spyOn(Date, 'now').mockReturnValue(t);

  it('belirteç paymentId anahtarıyla, sunucudaki 2 saatlik ömürle yazılır', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    expect(PAYMENT_CAPABILITY_TTL_MS).toBe(2 * 60 * 60 * 1000);
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string)).toEqual({
      token: 'cap-token',
      expiresAt: T0 + PAYMENT_CAPABILITY_TTL_MS,
    });
  });

  it('uygulama kapanıp açılınca (bellek boş) belirteç depodan okunur', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    restartApp();
    nowAt(T0 + 30 * 60 * 1000); // banka uygulamasından 30 dk sonra dönüş
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('süre dolmadan hemen önce geçerli, dolunca depodan silinir ve yok sayılır', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    restartApp();
    nowAt(T0 + PAYMENT_CAPABILITY_TTL_MS - 1);
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);

    restartApp();
    nowAt(T0 + PAYMENT_CAPABILITY_TTL_MS);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('bellek kopyasının da süresi dolar (uygulama hiç kapanmasa da), depodan silinir', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    nowAt(T0 + PAYMENT_CAPABILITY_TTL_MS + 1);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('bozuk kayıt yok sayılır ve silinir', async () => {
    await AsyncStorage.setItem(KEY, 'not-json');
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('yeni belirteç eskisinin üstüne yazılır (aynı ödeme yeniden başlatıldı)', async () => {
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'old' } });
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
    restartApp();
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('aynı süreçte depo ödeme başına bir kez okunur (yoklama her turda depoya gitmez)', async () => {
    for (let i = 0; i < 5; i++) expect(await paymentCapabilityHeaders('unknown')).toEqual({});
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

describe('depo hatası yedeği (yalnız bellek)', () => {
  it('setItem reddederse fırlatmaz; aynı süreçte bellek kopyası kullanılır', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(
      rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } }),
    ).resolves.toBeUndefined();
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('getItem reddederse fırlatmaz, başlık boş; sonraki istek yeniden dener', async () => {
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    restartApp();
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('removeItem reddederse fırlatmaz (süresi dolan yine yok sayılır)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    jest.spyOn(Date, 'now').mockReturnValue(T0 + PAYMENT_CAPABILITY_TTL_MS + 1);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });
});
