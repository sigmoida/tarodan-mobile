/**
 * API base URL: release build'i ASLA düz HTTP'ye / LAN adresine düşmez.
 */
jest.mock('@/services/logger', () => ({ logger: { error: jest.fn() } }));

import { logger } from '@/services/logger';
import { isReleaseEnvironment, releaseFallbackApiUrl, resolveApiBaseUrlFrom } from '../baseUrl';

const errSpy = logger.error as jest.Mock;
beforeEach(() => errSpy.mockClear());

describe('isReleaseEnvironment', () => {
  it.each([
    ['production', true, true],
    ['preview', true, true],
    ['development', false, false],
    [undefined, true, false],
    [undefined, false, true],
  ])('%s (isDev=%s) → %s', (env, isDev, expected) => {
    expect(isReleaseEnvironment(env as string | undefined, isDev as boolean)).toBe(expected);
  });
});

describe('resolveApiBaseUrlFrom — release', () => {
  it('https env adresi aynen kullanılır (sondaki / atılır)', () => {
    expect(
      resolveApiBaseUrlFrom({ environment: 'production', envUrl: 'https://tarodan.com.tr/api/', isDev: false }),
    ).toBe('https://tarodan.com.tr/api');
    expect(errSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['http', 'http://tarodan.com.tr/api'],
    ['boş', ''],
    ['eksik', undefined],
    ['şemasız', 'tarodan.com.tr/api'],
    ['userinfo', 'https://evil@tarodan.com.tr/api'],
  ])('production + %s adres → production https API, hata yazılır', (_n, envUrl) => {
    const url = resolveApiBaseUrlFrom({
      environment: 'production',
      envUrl,
      isDev: false,
      expoHost: '192.168.1.5',
      platform: 'android',
    });
    expect(url).toBe('https://tarodan.com.tr/api');
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it("preview + http → staging https API (production'a değil)", () => {
    expect(resolveApiBaseUrlFrom({ environment: 'preview', envUrl: 'http://x', isDev: false })).toBe(
      'https://staging.tarodan.com.tr/api',
    );
  });

  it('ortamı belirsiz release bundle da LAN/emülatör http adresine düşmez', () => {
    const url = resolveApiBaseUrlFrom({ environment: undefined, envUrl: undefined, isDev: false, platform: 'android' });
    expect(url.startsWith('https://')).toBe(true);
  });

  it('releaseFallbackApiUrl ortamın kendi host\'u', () => {
    expect(releaseFallbackApiUrl('production')).toBe('https://tarodan.com.tr/api');
    expect(releaseFallbackApiUrl('preview')).toBe('https://staging.tarodan.com.tr/api');
  });
});

describe('resolveApiBaseUrlFrom — geliştirme', () => {
  it('env adresi (http olsa da) kullanılır', () => {
    expect(
      resolveApiBaseUrlFrom({ environment: 'development', envUrl: 'http://10.0.0.2:3001/api', isDev: true }),
    ).toBe('http://10.0.0.2:3001/api');
  });

  it('env yoksa LAN host / emülatör / localhost', () => {
    expect(resolveApiBaseUrlFrom({ environment: undefined, envUrl: '', isDev: true, expoHost: '192.168.1.5' })).toBe(
      'http://192.168.1.5:3001/api',
    );
    expect(resolveApiBaseUrlFrom({ environment: undefined, envUrl: '', isDev: true, platform: 'android' })).toBe(
      'http://10.0.2.2:3001/api',
    );
    expect(resolveApiBaseUrlFrom({ environment: undefined, envUrl: '', isDev: true, platform: 'ios' })).toBe(
      'http://localhost:3001/api',
    );
  });
});
