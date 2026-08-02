/**
 * Refresh başarısızlığının SINIFI — ölçülmüş kanıta göre.
 *
 * Canlı ölçüm (staging, 2026-08-03, kimlikli oturumla):
 *   - Geçersiz/eksik token → `401 { i18nKey: 'server.auth.loginRequired' }`
 *   - Sunucunun refresh yolunda üretebildiği i18n anahtarları YALNIZCA üç
 *     tane: `invalidRefreshToken`, `refreshTokenExpired`, `refreshTokenRevoked`
 *     (katalog sunucudan üretiliyor; e-posta doğrulaması için refresh'e özel
 *     anahtar YOK — yalnız `emailNotVerifiedLogin` var, o da LOGIN yolunda).
 *   - Hesap durumu engelleri `errorCode` taşıyor (`USER_BANNED` bunun kanıtı).
 *
 * Sonuç: ölçülen üç durum GERÇEKTEN bitmiş oturumdur; sessiz logout doğru
 * davranıştır, bug değildir. Belirsiz olan tek şey `EMAIL_NOT_VERIFIED`'in
 * varlığı — üretilemedi (üç demo hesabın üçü de doğrulanmış). Bu yüzden ayrım
 * `errorCode` üzerinden yazıldı: kod hiç gelmezse davranış birebir aynı kalır.
 */
import { authFailureKind } from '../authFailureKind';

describe('authFailureKind', () => {
  it('treats a genuinely finished session as an expired session', () => {
    ['server.auth.invalidRefreshToken', 'server.auth.refreshTokenExpired', 'server.auth.refreshTokenRevoked'].forEach(
      (i18nKey) => {
        expect(authFailureKind({ response: { status: 401, data: { i18nKey } } })).toBe('expired');
      },
    );
  });

  it('treats a missing session the same way', () => {
    expect(
      authFailureKind({ response: { status: 401, data: { i18nKey: 'server.auth.loginRequired' } } }),
    ).toBe('expired');
  });

  it('recognises an unverified e-mail when the server codes it', () => {
    expect(
      authFailureKind({ response: { status: 401, data: { errorCode: 'EMAIL_NOT_VERIFIED' } } }),
    ).toBe('emailNotVerified');
  });

  it('prefers errorCode over i18nKey, matching the ban guard precedent', () => {
    expect(
      authFailureKind({
        response: {
          status: 401,
          data: { errorCode: 'EMAIL_NOT_VERIFIED', i18nKey: 'server.auth.invalidRefreshToken' },
        },
      }),
    ).toBe('emailNotVerified');
  });

  it('falls back to expired for anything it cannot identify', () => {
    // Tanımadığımız bir gövde için davranış DEĞİŞMEZ — oturum kapanır.
    expect(authFailureKind({ response: { status: 401, data: {} } })).toBe('expired');
    expect(authFailureKind({ message: 'Network Error' })).toBe('expired');
    expect(authFailureKind(null)).toBe('expired');
  });
});
