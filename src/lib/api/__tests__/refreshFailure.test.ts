/**
 * Refresh başarısızlığının sınıfı: yalnız sunucunun KESİN reddi oturumu bitirir.
 */
import { refreshFailureKind } from '../refreshFailure';

const http = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

describe('refreshFailureKind', () => {
  it.each([400, 401, 403])('%i → invalid (oturum biter)', (status) => {
    expect(refreshFailureKind(http(status))).toBe('invalid');
  });

  it.each(['server.auth.invalidRefreshToken', 'server.auth.refreshTokenExpired', 'server.auth.refreshTokenRevoked'])(
    'bilinen anahtar %s durum kodundan bağımsız invalid',
    (i18nKey) => {
      expect(refreshFailureKind(http(500, { i18nKey }))).toBe('invalid');
    },
  );

  it.each([408, 429, 500, 502, 503, 504, 404])('%i → transient (oturum korunur)', (status) => {
    expect(refreshFailureKind(http(status))).toBe('transient');
  });

  it('yanıtsız ağ hatası / zaman aşımı / iptal → transient', () => {
    expect(refreshFailureKind({ isAxiosError: true, code: 'ERR_NETWORK' })).toBe('transient');
    expect(refreshFailureKind({ isAxiosError: true, code: 'ECONNABORTED' })).toBe('transient');
    expect(refreshFailureKind({ isAxiosError: true, code: 'ERR_CANCELED' })).toBe('transient');
    expect(refreshFailureKind(new Error('boom'))).toBe('transient');
    expect(refreshFailureKind(null)).toBe('transient');
  });
});
