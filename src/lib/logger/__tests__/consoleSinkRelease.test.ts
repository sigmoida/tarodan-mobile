/**
 * Release'te logger.error/captureException bağlamındaki AxiosError ham basılmaz.
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { ConsoleSink } from '../console-sink';
import { createLogger } from '../logger';

const g = globalThis as unknown as { __DEV__: boolean };
let saved: boolean;
let errSpy: jest.SpyInstance;

const axiosErr = () => {
  const config = { url: '/x?t=qs', method: 'get', headers: new AxiosHeaders({ Authorization: 'Bearer SECRET-TOKEN' }) };
  return new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', config as never, {}, {
    status: 500, statusText: '', headers: {}, config, data: { leak: 'RESP-SECRET' },
  } as never);
};

beforeEach(() => {
  saved = g.__DEV__;
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  g.__DEV__ = saved;
  errSpy.mockRestore();
});

const printed = () => JSON.stringify(errSpy.mock.calls, (_k, v) => (v instanceof Error ? { ...v } : v));

describe('ConsoleSink release', () => {
  it('error bağlamındaki AxiosError özetlenir (token/gövde yok)', () => {
    g.__DEV__ = false;
    const log = createLogger({ name: 't', sinks: [new ConsoleSink()], minLevel: 'info' });
    log.captureException(axiosErr(), { flow: 'x' });
    const out = printed();
    expect(out).not.toContain('SECRET-TOKEN');
    expect(out).not.toContain('RESP-SECRET');
    expect(out).toContain('"status":500');
  });

  it('geliştirmede ham nesne korunur (yığın izi için)', () => {
    g.__DEV__ = true;
    const log = createLogger({ name: 't', sinks: [new ConsoleSink()], minLevel: 'debug' });
    const err = axiosErr();
    log.captureException(err);
    expect(errSpy.mock.calls[0].some((a: unknown) => a === err || (a as { error?: unknown })?.error === err)).toBe(true);
  });
});

/**
 * Release'te bağlam DERİNLEMESİNE temizlenir (`scrubForConsole`, Sentry ile ortak kurallar):
 * logger.* çağrılarının bağlamı bir sızıntı yolu. Sink'in temizliği burada kilitli.
 */
describe('ConsoleSink release: bağlam derin temizliği', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    g.__DEV__ = false;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  const all = () => JSON.stringify([...logSpy.mock.calls, ...warnSpy.mock.calls, ...errSpy.mock.calls]);
  const log = () => createLogger({ name: 't', sinks: [new ConsoleSink()], minLevel: 'debug' });

  it('iç içe response/data/headers/config/request anahtarları atılır', () => {
    log().warn('x', {
      nested: {
        deep: {
          response: { status: 500, data: { leak: 'RESP-SECRET' } },
          request: { _header: 'Authorization: SECRET-HDR' },
          headers: { 'x-api-key': 'HDR-SECRET' },
          config: { data: '{"password":"hunter2"}' },
          data: { leak: 'BODY-SECRET' },
        },
      },
      list: [{ response: { data: 'ARR-SECRET' } }],
    });
    const out = all();
    for (const secret of ['RESP-SECRET', 'SECRET-HDR', 'HDR-SECRET', 'hunter2', 'BODY-SECRET', 'ARR-SECRET']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('[scrubbed]');
  });

  it('iç içe hata nesnesi (AxiosError) özetlenir', () => {
    log().error('x', { wrapper: { failure: axiosErr(), items: [axiosErr()] } });
    const out = all();
    expect(out).not.toContain('SECRET-TOKEN');
    expect(out).not.toContain('RESP-SECRET');
    expect(out).toContain('"status":500');
  });

  it('token ve e-posta benzeri anahtar/değerler maskelenir', () => {
    log().warn('Giriş a@b.com için denendi', {
      pushToken: 'ExponentPushToken[abc]',
      fcmToken: 'x',
      email: 'kisi@example.com',
      note: 'Bearer abc.def.ghi bulundu, kullanici@example.com yazdı',
      jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2ln',
      opaque: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
      nested: { value: 'tel kisi2@example.org' },
    });
    const out = all();
    for (const secret of [
      'ExponentPushToken',
      'kisi@example.com',
      'a@b.com',
      'kullanici@example.com',
      'kisi2@example.org',
      'abc.def.ghi',
      'eyJhbGci',
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    ]) {
      expect(out).not.toContain(secret);
    }
  });

  it('teşhis alanları ve UUID kimlikler korunur', () => {
    log().warn('sipariş', {
      requestId: 'req-9',
      status: 401,
      orderId: '123e4567-e89b-12d3-a456-426614174000',
      count: 3,
      ok: true,
    });
    const out = all();
    expect(out).toContain('req-9');
    expect(out).toContain('401');
    expect(out).toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(out).toContain('"count":3');
  });

  it('döngüsel bağlam patlamaz; girdi değiştirilmez', () => {
    const ctx: Record<string, unknown> = { a: { b: 1 }, token: 'T-SECRET' };
    (ctx.a as Record<string, unknown>).self = ctx;
    expect(() => log().warn('x', ctx)).not.toThrow();
    expect(ctx.token).toBe('T-SECRET');
    expect(all()).not.toContain('T-SECRET');
  });

  it('json modunda da temizlenir', () => {
    createLogger({ name: 't', sinks: [new ConsoleSink({ json: true })], minLevel: 'debug' }).warn('x', {
      response: { data: 'JSON-SECRET' },
      email: 'a@b.com',
    });
    expect(all()).not.toContain('JSON-SECRET');
    expect(all()).not.toContain('a@b.com');
  });

  it('geliştirmede bağlam ham kalır', () => {
    g.__DEV__ = true;
    log().warn('x', { response: { data: 'DEV-VISIBLE' } });
    expect(all()).toContain('DEV-VISIBLE');
  });
});
