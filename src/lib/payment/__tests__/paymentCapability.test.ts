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

describe('withPaymentCapability (ödeme API sarmalayıcısı, paymentId açıkça verilir)', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  const paymentHttp = withPaymentCapability(client as unknown as Pick<AxiosInstance, 'get' | 'post'>);

  beforeEach(async () => {
    client.get.mockReset().mockResolvedValue({ data: { status: 'pending' } });
    client.post.mockReset().mockResolvedValue({ data: { ok: true } });
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  });

  it('GET: verilen ödemenin başlığını ekler, yanıtı aynen döner', async () => {
    const res = await paymentHttp(PAY).get(`/payments/${PAY}/status`);
    expect(client.get).toHaveBeenCalledWith(`/payments/${PAY}/status`, { headers: CAP });
    expect(res).toEqual({ data: { status: 'pending' } });
  });

  it('POST: gövde aynen gider, başlık eklenir', async () => {
    await paymentHttp(PAY).post(`/payments/${PAY}/verify`, {});
    expect(client.post).toHaveBeenCalledWith(`/payments/${PAY}/verify`, {}, { headers: CAP });
  });

  it('id URL\'den ya da gövdeden ÇIKARILMAZ: yalnız çağıranın verdiği id sayılır', async () => {
    // Yol ve gövde PAY'i gösterse de çağıran başka ödeme verdiyse başlık yok.
    await paymentHttp('other').post(`/payments/${PAY}/verify`, { paymentId: PAY });
    expect(client.post).toHaveBeenLastCalledWith(`/payments/${PAY}/verify`, { paymentId: PAY }, { headers: {} });
    // Yol biçimi farklı (direct-form, ileride başka uç) olsa da verilen id'nin başlığı gider.
    await paymentHttp(PAY).post('/payments/direct-form', { checkoutGroupId: 'g-1' });
    expect(client.post).toHaveBeenLastCalledWith('/payments/direct-form', { checkoutGroupId: 'g-1' }, { headers: CAP });
  });

  it.each([
    ['id yok (undefined)', undefined],
    ['id null', null],
    ['boş id', ''],
    ['belirteci olmayan ödeme', 'other'],
  ])('%s → başlık eklenmez', async (_label, id) => {
    await paymentHttp(id).get('/payments/x/status');
    expect(client.get).toHaveBeenLastCalledWith('/payments/x/status', { headers: {} });
  });

  it('çağıranın config\'i ve başlıkları korunur', async () => {
    await paymentHttp(PAY).get(`/payments/${PAY}/status`, { timeout: 5000, headers: { 'X-Trace': '1' } });
    expect(client.get).toHaveBeenCalledWith(`/payments/${PAY}/status`, {
      timeout: 5000,
      headers: { 'X-Trace': '1', ...CAP },
    });
  });

  it('istek hatası çağırana aynen iletilir', async () => {
    const err = Object.assign(new Error('403'), { response: { status: 403 } });
    client.post.mockRejectedValueOnce(err);
    await expect(paymentHttp(PAY).post(`/payments/${PAY}/confirm-failed`, {})).rejects.toBe(err);
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
