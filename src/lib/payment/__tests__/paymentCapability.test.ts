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
  bindPaymentCapabilitiesToAccount,
  capabilityLifetimeMs,
  clearAllPaymentCapabilities,
  CLOCK_ROLLBACK_TOLERANCE_MS,
  forgetPaymentCapability,
  forgetPaymentCapabilityIfFinal,
  ISSUE_LATENCY_MARGIN_MS,
  PAYMENT_CAPABILITY_TTL_MS,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
  sweepExpiredPaymentCapabilities,
  unbindPaymentCapabilityAccount,
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
      owner: null, // oturum yokken alındı: sahipsiz (misafir)
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

  it('storedAt\'sız kayıt okunmaya devam eder', async () => {
    nowAt(T0);
    await AsyncStorage.setItem(KEY, JSON.stringify({ token: 'cap-token', expiresAt: T0 + 60_000, owner: null }));
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('sahibi bilinmeyen kayıt (owner alanı yok, eski biçim) hiçbir kimliğe eklenmez', async () => {
    nowAt(T0);
    await AsyncStorage.setItem(KEY, JSON.stringify({ token: 'cap-token', expiresAt: T0 + 60_000, storedAt: T0 }));
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await paymentCapabilityHeaders(PAY, { guest: true })).toEqual({});
    await bindPaymentCapabilitiesToAccount('user-a');
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
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

describe('temizlik: kesin sonuç, çıkış, açılış süpürmesi', () => {
  const nowAt = (t: number) => jest.spyOn(Date, 'now').mockReturnValue(t);
  const remember = (paymentId: string, token = 'cap-token') =>
    rememberPaymentCapability({ data: { paymentId, paymentAccessToken: token } });
  const capabilityKeys = async () =>
    (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('payment-capability.')).sort();

  it('forgetPaymentCapability: bellek ve depodan siler; yeniden başlatınca da yok', async () => {
    await remember(PAY);
    await forgetPaymentCapability(PAY);
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    restartApp();
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });

  it.each(['completed', 'paid', 'success', 'hold_payment', 'refunded', 'cancelled'])(
    'kesin durum (%s) → kayıt silinir',
    async (status) => {
      await remember(PAY);
      await forgetPaymentCapabilityIfFinal(PAY, status);
      expect(await paymentCapabilityHeaders(PAY)).toEqual({});
      expect(await AsyncStorage.getItem(KEY)).toBeNull();
    },
  );

  // failed kesin değil: retry aynı ödemeyi failed → pending yapar, yeni belirteç vermez.
  it.each([['pending'], ['processing'], ['failed'], [undefined], [null]])('kesin olmayan durum (%s) → kayıt kalır', async (status) => {
    await remember(PAY);
    await forgetPaymentCapabilityIfFinal(PAY, status);
    expect(await paymentCapabilityHeaders(PAY)).toEqual(CAP);
  });

  it('çıkış: tüm payment-capability.* kayıtları (bellek + depo) silinir, diğer anahtarlar kalır', async () => {
    await remember('pay-a');
    await remember('pay-b');
    await AsyncStorage.setItem('tarodan-cart', '{"items":[]}');
    expect(await capabilityKeys()).toEqual(['payment-capability.pay-a', 'payment-capability.pay-b']);

    const pending = clearAllPaymentCapabilities();
    // Bellek senkron temizlenir: çağıran beklemese de sonraki istek başlıksız.
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    await pending;
    expect(await capabilityKeys()).toEqual([]);
    expect(await AsyncStorage.getItem('tarodan-cart')).toBe('{"items":[]}');
    restartApp();
    expect(await paymentCapabilityHeaders('pay-b')).toEqual({});
  });

  it('çıkış sürerken depodan okuma silinmekte olan belirteci geri getirmez', async () => {
    await remember(PAY);
    restartApp(); // bellek boş, kayıt yalnız depoda
    const clearing = clearAllPaymentCapabilities();
    const read = paymentCapabilityHeaders(PAY); // silme bitmeden okuma
    await clearing;
    expect(await read).toEqual({});
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });

  it('çıkıştan önce başlayan depo okuması sonradan belleğe yazamaz', async () => {
    await remember(PAY);
    restartApp();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const realGet = (AsyncStorage.getItem as jest.Mock).getMockImplementation()!;
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async (key: string) => {
      const value = await realGet(key);
      await gate; // okuma, çıkış bitene kadar asılı
      return value;
    });
    const read = paymentCapabilityHeaders(PAY);
    await clearAllPaymentCapabilities();
    release();
    expect(await read).toEqual({});
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });

  it('depo yazımı sürerken çıkış yapılırsa belirteç depoda kalmaz', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const realSet = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (key: string, value: string) => {
      await gate;
      return realSet(key, value);
    });
    const writing = remember(PAY);
    await clearAllPaymentCapabilities();
    release();
    await writing;
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('açılış süpürmesi: süresi dolan, bozuk ve saati geri alınmış kayıtlar silinir; geçerli olan ve diğer anahtarlar kalır', async () => {
    nowAt(T0 - 3 * 60 * 60 * 1000);
    await remember('expired'); // 3 saat önce: dolmuş
    nowAt(T0 + 10 * 60 * 1000);
    await remember('future'); // kayıt anı şimdiden 10 dk ileride: saat geri alınmış
    nowAt(T0 - 30 * 60 * 1000);
    await remember('live'); // 30 dk önce: geçerli
    await AsyncStorage.setItem('payment-capability.corrupt', 'not-json');
    await AsyncStorage.setItem('other-key', 'keep');

    await sweepExpiredPaymentCapabilities(T0);
    expect(await capabilityKeys()).toEqual(['payment-capability.live']);
    expect(await AsyncStorage.getItem('other-key')).toBe('keep');
  });

  it('depo hataları fırlatmaz (getAllKeys / multiRemove)', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await expect(sweepExpiredPaymentCapabilities()).resolves.toBeUndefined();
    await remember(PAY);
    (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await expect(clearAllPaymentCapabilities()).resolves.toBeUndefined();
    // Depodan silinemese de bu süreçte çıkıştan önceki kayıt geri yüklenmez.
    expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  });
});

describe('sahiplik: belirteç yalnız alındığı kimliğe eklenir', () => {
  const remember = (paymentId: string, scope?: { guest?: boolean }) =>
    rememberPaymentCapability({ data: { paymentId, paymentAccessToken: `cap-${paymentId}` } }, scope);
  const cap = (paymentId: string) => ({ 'X-Payment-Capability': `cap-${paymentId}` });
  const stored = async (paymentId: string) =>
    JSON.parse((await AsyncStorage.getItem(`payment-capability.${paymentId}`)) as string);
  const capabilityKeys = async () =>
    (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('payment-capability')).sort();

  it('misafir başlatma: sahipsiz kayıt; misafir istekleri ekler, hesap oturumu eklemez', async () => {
    await remember('guest-pay', { guest: true });
    expect((await stored('guest-pay')).owner).toBeNull();
    expect(await paymentCapabilityHeaders('guest-pay', { guest: true })).toEqual(cap('guest-pay'));
    expect(await paymentCapabilityHeaders('guest-pay')).toEqual(cap('guest-pay')); // oturum yok: kimlik misafir
    await bindPaymentCapabilitiesToAccount('user-a');
    expect(await paymentCapabilityHeaders('guest-pay')).toEqual({}); // A'nın oturumu misafirinkini eklemez
    expect(await paymentCapabilityHeaders('guest-pay', { guest: true })).toEqual(cap('guest-pay'));
  });

  it('üye başlatma: kayıt hesabın; misafir istekleri eklemez, aynı hesap ekler', async () => {
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('pay-a');
    expect((await stored('pay-a')).owner).toBe('user-a');
    expect(await paymentCapabilityHeaders('pay-a')).toEqual(cap('pay-a'));
    expect(await paymentCapabilityHeaders('pay-a', { guest: true })).toEqual({});
  });

  it('misafir başlatma oturum açıkken bile sahipsiz yazılır ({ guest: true })', async () => {
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('guest-pay', { guest: true });
    expect((await stored('guest-pay')).owner).toBeNull();
  });

  it('zorunlu çıkış (unbind): kayıt kalır ama misafir kimliğine eklenmez; aynı hesap girince (yeniden başlatma dahil) eklenir', async () => {
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('pay-a');
    unbindPaymentCapabilityAccount();
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    expect(await paymentCapabilityHeaders('pay-a', { guest: true })).toEqual({});
    expect(await capabilityKeys()).toEqual(['payment-capability.pay-a']);

    await bindPaymentCapabilitiesToAccount('user-a');
    expect(await paymentCapabilityHeaders('pay-a')).toEqual(cap('pay-a'));
    restartApp();
    await bindPaymentCapabilitiesToAccount('user-a');
    expect(await paymentCapabilityHeaders('pay-a')).toEqual(cap('pay-a'));
  });

  it('başka hesap girer: önceki hesabın belirteçleri (bellek + depo) silinir; misafirinkiler kalır', async () => {
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('pay-a');
    unbindPaymentCapabilityAccount();
    await remember('guest-pay', { guest: true });
    await bindPaymentCapabilitiesToAccount('user-b');
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    expect(await capabilityKeys()).toEqual(['payment-capability.guest-pay']);
    expect(await paymentCapabilityHeaders('guest-pay', { guest: true })).toEqual(cap('guest-pay'));
  });

  it('yeniden başlatmadan sonra başka hesap girer: depodaki sahip bilgisinden silinir', async () => {
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('pay-a');
    restartApp();
    await bindPaymentCapabilitiesToAccount('user-b');
    expect(await paymentCapabilityHeaders('pay-a')).toEqual({});
    expect(await capabilityKeys()).toEqual([]);
  });

  it('girişte sahibi bilinmeyen ya da bozuk kayıtlar da silinir', async () => {
    await AsyncStorage.setItem('payment-capability.legacy', JSON.stringify({ token: 't', expiresAt: Date.now() + 60_000 }));
    await AsyncStorage.setItem('payment-capability.corrupt', 'not-json');
    await bindPaymentCapabilitiesToAccount('user-b');
    expect(await capabilityKeys()).toEqual([]);
  });

  it('misafir sarmalayıcısı ({ guest: true }) yalnız sahipsiz belirteci ekler', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn() };
    const guestHttp = withPaymentCapability(client as unknown as Pick<AxiosInstance, 'get' | 'post'>, { guest: true });
    await bindPaymentCapabilitiesToAccount('user-a');
    await remember('pay-a');
    unbindPaymentCapabilityAccount();
    await guestHttp('pay-a').get('/payments/pay-a/status-guest');
    expect(client.get).toHaveBeenLastCalledWith('/payments/pay-a/status-guest', { headers: {} });
    await remember('guest-pay', { guest: true });
    await guestHttp('guest-pay').get('/payments/guest-pay/status-guest');
    expect(client.get).toHaveBeenLastCalledWith('/payments/guest-pay/status-guest', { headers: cap('guest-pay') });
  });

  it('boş hesap id\'si yok sayılır; depo hataları fırlatmaz', async () => {
    await expect(bindPaymentCapabilitiesToAccount(undefined)).resolves.toBeUndefined();
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await expect(bindPaymentCapabilitiesToAccount('user-a')).resolves.toBeUndefined();
    await remember('pay-b', { guest: false });
    (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await expect(bindPaymentCapabilitiesToAccount('user-b')).resolves.toBeUndefined();
  });
});
