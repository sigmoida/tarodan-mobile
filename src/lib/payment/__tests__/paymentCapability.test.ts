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
  capabilityLifetimeMs,
  CLOCK_ROLLBACK_TOLERANCE_MS,
  ISSUE_LATENCY_MARGIN_MS,
  PAYMENT_CAPABILITY_TTL_MS,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
  withPaymentCapability,
} from '../paymentCapability';

const PAY = 'pay-1';
const KEY = `payment-capability.${PAY}`;
const CAP = { 'X-Payment-Capability': 'cap-token' };
const T0 = Date.UTC(2026, 9, 13, 9, 0, 0);
/** JWT olmayan belirteç ('cap-token') → `exp` okunamaz → yedek 2 saat (− imza payı). */
const FALLBACK_EXPIRES = T0 + PAYMENT_CAPABILITY_TTL_MS - ISSUE_LATENCY_MARGIN_MS;

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

describe('kalıcılık (AsyncStorage)', () => {
  const nowAt = (t: number) => jest.spyOn(Date, 'now').mockReturnValue(t);

  it('belirteç paymentId anahtarıyla yazılır; exp okunamazsa 2 saatlik yedek ömürle', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    expect(PAYMENT_CAPABILITY_TTL_MS).toBe(2 * 60 * 60 * 1000);
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string)).toEqual({
      token: 'cap-token',
      expiresAt: FALLBACK_EXPIRES,
      storedAt: T0,
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
    nowAt(FALLBACK_EXPIRES - 1);
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);

    restartApp();
    nowAt(FALLBACK_EXPIRES);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('bellek kopyasının da süresi dolar (uygulama hiç kapanmasa da), depodan silinir', async () => {
    nowAt(T0);
    await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
    nowAt(FALLBACK_EXPIRES + 1);
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
    jest.spyOn(Date, 'now').mockReturnValue(FALLBACK_EXPIRES + 1);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });
});

describe('TTL belirtecin kendi JWT exp alanından', () => {
  const nowAt = (t: number) => jest.spyOn(Date, 'now').mockReturnValue(t);
  const b64url = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  /** İmzasız test JWT'si (istemci imzayı doğrulamaz, yalnız exp/iat okur). */
  const jwt = (claims: Record<string, unknown>) =>
    `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: PAY, type: 'payment_capability', ...claims })}.sig`;
  const sec = (ms: number) => Math.floor(ms / 1000);
  const stored = async () => JSON.parse((await AsyncStorage.getItem(KEY)) as string);
  const remember = (token: string) => rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: token } });

  it('ömür exp − iat (30 dk\'lık belirteç → 30 dk − imza payı), 2 saat sabiti değil', async () => {
    nowAt(T0);
    const token = jwt({ iat: sec(T0), exp: sec(T0) + 30 * 60 });
    await remember(token);
    expect((await stored()).expiresAt).toBe(T0 + 30 * 60 * 1000 - ISSUE_LATENCY_MARGIN_MS);

    restartApp();
    nowAt(T0 + 30 * 60 * 1000 - ISSUE_LATENCY_MARGIN_MS); // exp'e 30 sn kala düşer
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });

  it('kayıt exp\'ten uzun tutulmaz: belirteç imzadan 30 sn sonra ulaşsa da kayıt en geç exp\'te biter', async () => {
    const issuedAt = T0;
    const expMs = issuedAt + 2 * 60 * 60 * 1000;
    nowAt(issuedAt + ISSUE_LATENCY_MARGIN_MS); // en yavaş yanıt (istemci zaman aşımı)
    await remember(jwt({ iat: sec(issuedAt), exp: sec(expMs) }));
    expect((await stored()).expiresAt).toBeLessThanOrEqual(expMs);
  });

  it.each([
    ['cihaz saati 5 saat ileri', 5 * 60 * 60 * 1000],
    ['cihaz saati 1 gün geri', -24 * 60 * 60 * 1000],
  ])('%s: ömür yine exp − iat (taze belirteç saklanır ve gönderilir)', async (_label, skew) => {
    nowAt(T0 + skew); // sunucu T0'da imzaladı
    await remember(jwt({ iat: sec(T0), exp: sec(T0) + 2 * 60 * 60 }));
    expect((await stored()).expiresAt).toBe(T0 + skew + 2 * 60 * 60 * 1000 - ISSUE_LATENCY_MARGIN_MS);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({ 'X-Payment-Capability': expect.any(String) });
  });

  it('saat kayıt anından öteye GERİ alınırsa kayıt düşer (exp\'ten uzun yaşamasın); küçük düzeltme tolere edilir', async () => {
    nowAt(T0);
    await remember(jwt({ iat: sec(T0), exp: sec(T0) + 2 * 60 * 60 }));

    restartApp();
    nowAt(T0 - CLOCK_ROLLBACK_TOLERANCE_MS); // NTP düzeltmesi kadar geri: geçerli
    expect(await paymentCapabilityHeaders(PAY)).toEqual({ 'X-Payment-Capability': expect.any(String) });

    restartApp();
    nowAt(T0 - CLOCK_ROLLBACK_TOLERANCE_MS - 1); // elle geri alınmış saat
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('iat yoksa exp − şimdi, en fazla 2 saat; exp geçmişteyse saklanmaz', async () => {
    expect(capabilityLifetimeMs(jwt({ exp: sec(T0) + 600 }), T0)).toBe(600_000);
    expect(capabilityLifetimeMs(jwt({ exp: sec(T0) + 10 * 60 * 60 }), T0)).toBe(PAYMENT_CAPABILITY_TTL_MS);

    nowAt(T0);
    await remember(jwt({ exp: sec(T0) - 1 }));
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });

  it('zaten dolmuş belirteç (exp ≤ iat + imza payı) saklanmaz', async () => {
    nowAt(T0);
    await remember(jwt({ iat: sec(T0), exp: sec(T0) + 10 }));
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    ['JWT değil', 'cap-token'],
    ['gövde base64 değil', 'a.@@@.c'],
    ['gövde JSON değil', `a.${Buffer.from('not json').toString('base64url')}.c`],
    ['exp yok', jwt({ iat: sec(T0) })],
    ['exp sayı değil', jwt({ iat: sec(T0), exp: 'yarın' })],
  ])('exp okunamazsa (%s) 2 saate düşer', (_label, token) => {
    expect(capabilityLifetimeMs(token, T0)).toBe(PAYMENT_CAPABILITY_TTL_MS - ISSUE_LATENCY_MARGIN_MS);
  });

  it('base64url çözümü: -, _ ve dolgusuz gövde', () => {
    // Bu gövde base64url'de '-' ve '_' içerir (standart base64'te '+' ve '/').
    const claims = { iat: 1760000000, exp: 1760007200, note: '>>>???' };
    const token = `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
    expect(token).toMatch(/[-_]/);
    expect(capabilityLifetimeMs(token, T0)).toBe(7200 * 1000 - ISSUE_LATENCY_MARGIN_MS);
  });
});
