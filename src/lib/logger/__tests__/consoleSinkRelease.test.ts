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
