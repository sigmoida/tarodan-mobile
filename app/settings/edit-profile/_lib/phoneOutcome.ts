/**
 * Profil kaydından sonra telefonun akıbeti (B-1.7).
 *
 * `PATCH /users/me` numara değişince `isPhoneVerified=false` yazar; ama numara
 * BAŞKA bir hesapta doğrulanmamış olarak duruyorsa numarayı YAZMAZ ve yine 200
 * döner (apps/api user-profile.service.ts `updateProfile`, `phoneHeldUnverified`).
 * O durumda numara ancak SMS doğrulaması başarılı olunca hesaba geçer
 * (phone-verification.service.ts `verify`). Yani yanıttaki telefon, gönderilen
 * değil ESKİ numaradır — "Profil güncellendi" demek yanlış olur.
 *
 * - `unchanged`: numara gönderilmedi ya da değişmedi → normal başarı.
 * - `verify`:    yeni numara kaydedildi → doğrulama akışına yönlendir.
 * - `notSaved`:  yeni numara kaydedilmedi (yanıt farklı) → başarı DEĞİL;
 *                açıklayıcı uyarı + yine doğrulama akışı (numarayı devralmanın tek yolu).
 */
export type PhoneOutcome = 'unchanged' | 'verify' | 'notSaved';

export function resolvePhoneOutcome(
  previousPhone: string | null | undefined,
  sentPhone: string | null | undefined,
  responsePhone: string | null | undefined,
): PhoneOutcome {
  // Boş gönderim payload'dan düşürülüyor (undefined) → numaraya dokunulmadı.
  if (!sentPhone) return 'unchanged';
  if (sentPhone === (previousPhone || '')) return 'unchanged';
  return responsePhone === sentPhone ? 'verify' : 'notSaved';
}
