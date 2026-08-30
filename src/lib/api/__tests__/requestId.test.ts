/**
 * `x-request-id` — sunucu her yanıtta bir UUID döndürüyor (canlı doğrulandı,
 * staging 2026-08-03) ama istemci hiçbir yerde okumuyordu. Destek ve hata
 * ayıklama için en ucuz kazanç: hata yollarında Sentry'ye taşınır.
 *
 * PII yok — yalnız istek kimliği, metot, yol ve durum kodu.
 */
import { requestIdOf, errorFingerprint } from '../requestId';

function axiosErrorWith(headers: Record<string, string>, extra: Record<string, unknown> = {}) {
  return { response: { status: 500, headers, data: {} }, config: { method: 'get', url: '/x' }, ...extra };
}

describe('requestIdOf', () => {
  it('reads the header the server actually sends', () => {
    expect(requestIdOf(axiosErrorWith({ 'x-request-id': 'abc-123' }))).toBe('abc-123');
  });

  it('is case insensitive about the header name', () => {
    expect(requestIdOf(axiosErrorWith({ 'X-Request-Id': 'abc-123' }))).toBe('abc-123');
  });

  it('returns undefined when the header is absent', () => {
    expect(requestIdOf(axiosErrorWith({}))).toBeUndefined();
  });

  it('survives an error with no response at all (network failure)', () => {
    expect(requestIdOf({ message: 'Network Error' })).toBeUndefined();
    expect(requestIdOf(null)).toBeUndefined();
  });
});

describe('errorFingerprint', () => {
  it('collects the request id, status, method and path without any payload', () => {
    const fp = errorFingerprint(axiosErrorWith({ 'x-request-id': 'r-1' }));

    expect(fp).toEqual({ requestId: 'r-1', status: 500, method: 'GET', url: '/x' });
  });

  it('carries the server discriminators when present', () => {
    const err = {
      response: {
        status: 401,
        headers: { 'x-request-id': 'r-2' },
        data: { i18nKey: 'server.auth.invalidRefreshToken', errorCode: 'USER_BANNED' },
      },
      config: { method: 'post', url: '/auth/refresh' },
    };

    expect(errorFingerprint(err)).toEqual({
      requestId: 'r-2',
      status: 401,
      method: 'POST',
      url: '/auth/refresh',
      i18nKey: 'server.auth.invalidRefreshToken',
      errorCode: 'USER_BANNED',
    });
  });

  it('never carries the request body, headers or the message text', () => {
    const err = {
      response: {
        status: 400,
        headers: { 'x-request-id': 'r-3', authorization: 'Bearer secret' },
        data: { message: 'Telefon numarası 05321234567 geçersiz' },
      },
      config: { method: 'post', url: '/auth/phone/send-code', data: '{"phone":"+905321234567"}' },
    };

    const serialized = JSON.stringify(errorFingerprint(err));

    expect(serialized).not.toContain('05321234567');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('geçersiz');
  });
});
