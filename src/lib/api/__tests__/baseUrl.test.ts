/**
 * API base URL: AÇIKÇA production / preview / staging build'i düz HTTP'ye / LAN adresine
 * düşmez; ortamı belirsiz build production'a SESSİZCE yönlendirilmez.
 */
jest.mock('@/services/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

import { logger } from '@/services/logger';
import { isReleaseEnvironment, releaseFallbackApiUrl, resolveApiBaseUrlFrom } from '../baseUrl';

const errSpy = logger.error as jest.Mock;
const warnSpy = logger.warn as jest.Mock;
beforeEach(() => {
  errSpy.mockClear();
  warnSpy.mockClear();
});

describe('isReleaseEnvironment', () => {
  it.each([
    ['production', true],
    ['preview', true],
    ['staging', true],
    ['development', false],
    [undefined, false],
  ])('%s → %s', (env, expected) => {
    expect(isReleaseEnvironment(env as string | undefined)).toBe(expected);
  });
});

describe('resolveApiBaseUrlFrom — production / preview', () => {
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
    ['varsayılan dışı port', 'https://tarodan.com.tr:8443/api'],
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

  it('releaseFallbackApiUrl ortamın kendi host\'u', () => {
    expect(releaseFallbackApiUrl('production')).toBe('https://tarodan.com.tr/api');
    expect(releaseFallbackApiUrl('preview')).toBe('https://staging.tarodan.com.tr/api');
    expect(releaseFallbackApiUrl('staging')).toBe('https://staging.tarodan.com.tr/api');
  });
});

describe('resolveApiBaseUrlFrom — ortamı belirsiz release (yerel release, Maestro)', () => {
  it('yapılandırılan adres OLDUĞU GİBİ kullanılır; production\'a sessizce yönlendirilmez, uyarı yazılır', () => {
    expect(
      resolveApiBaseUrlFrom({ environment: undefined, envUrl: 'http://192.168.1.5:3001/api', isDev: false }),
    ).toBe('http://192.168.1.5:3001/api');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('https adreste uyarı yok', () => {
    expect(
      resolveApiBaseUrlFrom({ environment: undefined, envUrl: 'https://staging.tarodan.com.tr/api', isDev: false }),
    ).toBe('https://staging.tarodan.com.tr/api');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('adres yoksa geliştirme yedeği (production değil)', () => {
    const url = resolveApiBaseUrlFrom({ environment: undefined, envUrl: undefined, isDev: false, platform: 'android' });
    expect(url).toBe('http://10.0.2.2:3001/api');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('resolveApiBaseUrlFrom — geliştirme', () => {
  it('env adresi (http olsa da) kullanılır, uyarı yok', () => {
    expect(
      resolveApiBaseUrlFrom({ environment: 'development', envUrl: 'http://10.0.0.2:3001/api', isDev: true }),
    ).toBe('http://10.0.0.2:3001/api');
    expect(warnSpy).not.toHaveBeenCalled();
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
