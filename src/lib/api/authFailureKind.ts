/**
 * Oturum düşmesinin SINIFI.
 *
 * Denetim (2026-08-03) bu ayrımı "kör bağlama yapma" diye bloklamıştı, çünkü
 * gövdeler üretilememişti. Kimlikli ölçümden sonra elimizde şu var:
 *
 * | Ne | Ölçüm |
 * |---|---|
 * | Geçersiz/eksik token | `401 { i18nKey: 'server.auth.loginRequired' }` |
 * | Refresh yolunun ÜRETEBİLDİĞİ anahtarlar | yalnız `invalidRefreshToken`, `refreshTokenExpired`, `refreshTokenRevoked` |
 * | E-posta doğrulaması | refresh'e özel anahtar YOK; katalogda yalnız `emailNotVerifiedLogin` (LOGIN yolu) |
 * | Hesap durumu engelleri | `errorCode` taşıyor — `USER_BANNED` bunun kanıtı |
 *
 * Yani ölçülen üç durumun üçü de gerçekten bitmiş oturumdur ve bugünkü sessiz
 * çıkış **doğru davranıştır**. Belirsiz kalan tek şey `EMAIL_NOT_VERIFIED`:
 * üç demo hesabın üçü de doğrulanmış olduğu için gövdesi üretilemedi.
 *
 * Bu yüzden ayrım `errorCode` üzerinden yazıldı — `USER_BANNED` ile aynı
 * yüzey. Kod hiç gelmezse dal hiç çalışmaz ve davranış birebir korunur; kör
 * bağlama riski yok. Gerçek gövde bir kez Sentry'de görüldüğünde (bkz.
 * `./requestId`) buraya tek satır eklenir.
 */
export type AuthFailureKind = 'expired' | 'emailNotVerified';

type LooseError = {
  response?: { status?: number; data?: { errorCode?: unknown; i18nKey?: unknown } };
};

export function authFailureKind(error: unknown): AuthFailureKind {
  const data = (error as LooseError | null)?.response?.data;
  // errorCode önce: ban guard'ın kullandığı yüzey, en spesifik olanı.
  if (data?.errorCode === 'EMAIL_NOT_VERIFIED') return 'emailNotVerified';
  // Tanımadığımız her şey "oturum bitti" sayılır — güvenli varsayılan.
  return 'expired';
}
