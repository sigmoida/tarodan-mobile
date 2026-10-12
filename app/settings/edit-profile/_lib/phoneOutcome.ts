import { parseE164TrPhone, parsePhoneForPayload, splitPhone } from '@/utils/phone';

/**
 * Profil kaydında telefonun akıbeti (B-1.7).
 *
 * `PATCH /users/me` (apps/api user-profile.service.ts `updateProfile`) numara
 * değişince `isPhoneVerified=false` yazar; ama numara BAŞKA bir hesapta
 * doğrulanmamış olarak duruyorsa numarayı YAZMAZ ve yine 200 döner (yanıt zarfsız
 * kullanıcı nesnesi, `phone` ESKİ numara). O durumda numara ancak SMS doğrulaması
 * başarılı olunca hesaba geçer (phone-verification.service.ts `verify`).
 *
 * Sonuç, kayıttan sonra TAZELENEN kullanıcının (`refreshUserData`) telefonuyla
 * belirlenir; iki taraf da aynı E.164 normalizasyonundan (`phoneKey`) geçer.
 */
export type PhoneOutcome =
  | { outcome: 'unchanged' }
  | { outcome: 'verify' | 'notSaved'; phone: string };

/**
 * Karşılaştırma anahtarı: TR numarası `+905XXXXXXXXX`'e (`parseE164TrPhone`)
 * çözülür; çözülemeyen eski kayıt (TR dışı vb.) boşluksuz ham hâliyle kalır.
 * Böylece `0532 123 45 67`, `+90 532…` ve `+90532…` aynı numara sayılır.
 */
export function phoneKey(raw: string | null | undefined): string {
  const clean = (raw ?? '').replace(/\s/g, '');
  if (!clean) return '';
  return parseE164TrPhone(clean) ?? clean;
}

/**
 * Formdaki telefondan gönderilecek değer:
 * - `undefined` → numaraya dokunma (payload'a girmez);
 * - `'+90…'`    → yeni numara;
 * - `null`      → çözülemeyen girdi, gönderim durmalı.
 *
 * Kayıtlı numarayla AYNI numara (biçimi farklı olsa da) gönderilmez: sunucu ham
 * dizgiyi karşılaştırır, E.164 olmayan eski bir kaydı `+90…` olarak yeniden
 * göndermek numarayı "değişti" sayıp doğrulamayı düşürürdü. Alana hiç
 * dokunulmadıysa (TR dışı eski kayıt dahil) doğrulama da yapılmaz.
 */
export function phoneToSend(
  previousPhone: string | null | undefined,
  formPhone: string | null | undefined,
  countryCode: string,
): string | null | undefined {
  const initial = splitPhone(previousPhone ?? '');
  const text = (formPhone ?? '').trim();
  if (countryCode === initial.countryCode && text === initial.phone.trim()) return undefined;
  if (!text) return undefined;
  const parsed = parsePhoneForPayload(text, countryCode);
  if (!parsed) return null;
  return phoneKey(parsed) === phoneKey(previousPhone) ? undefined : parsed;
}

/**
 * @param sentPhone  `phoneToSend` sonucu (gönderilmediyse `undefined`)
 * @param savedPhone kayıttan SONRA tazelenen kullanıcının telefonu
 */
export function resolvePhoneOutcome(
  sentPhone: string | undefined,
  savedPhone: string | null | undefined,
): PhoneOutcome {
  if (sentPhone === undefined) return { outcome: 'unchanged' };
  return phoneKey(savedPhone) === phoneKey(sentPhone)
    ? { outcome: 'verify', phone: sentPhone }
    : { outcome: 'notSaved', phone: sentPhone };
}
