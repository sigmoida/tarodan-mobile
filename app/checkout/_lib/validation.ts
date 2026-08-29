/**
 * ⚠️ React DIŞI modül — `useTranslation` çağıramaz. Kullanıcıya dönen mesajlar
 * global i18next örneğinden okunur; anahtarlar yine tip-denetimli
 * (`i18next.d.ts` augmentation). Mesajlar tek seferlik üretildiği için dil
 * değişiminde yeniden render gerekmiyor.
 */
import i18n from '@/i18n/config';
import { DEFAULT_COUNTRY_CODE, isValidPhoneInput, getPhoneInvalidMessage } from '@/utils/phone';
import type { ShippingAddressInput } from './types';

export const extractApiMessage = (e: any): string | null => {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string') return m;
  if (typeof e?.response?.data?.error === 'string') return e.response.data.error;
  return null;
};

/**
 * Misafir iletişim bilgileri.
 *
 * ⚠️ Telefon kuralı `@/utils/phone` TEK KAYNAĞINDAN gelir. Eski `≥10 hane`
 * sayımı `00905321234567`, `+1 415 555 0100` ve `05321234567890` girdilerinin
 * ÜÇÜNÜ DE geçiriyordu — hepsi on haneden uzun. `countryCode` bu yüzden imzada:
 * doğrulama ile payload normalizasyonu aynı ülke kodunu görmezse ayrışır.
 */
export const validateGuest = (
  name: string,
  email: string,
  phone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null => {
  if (!name.trim()) return i18n.t('checkout.nameRequired');
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return i18n.t('checkout.invalidEmail');
  if (!phone.trim()) return i18n.t('checkout.phoneRequired');
  if (!isValidPhoneInput(phone, countryCode)) return getPhoneInvalidMessage();
  return null;
};

/**
 * Inline (kaydedilmemiş) adres alanları.
 *
 * Telefon iki AYRI hâl: BOŞ ise "gerekli", DOLU ama çözülemiyorsa neyin yanlış
 * olduğunu söyleyen paylaşılan mesaj — tek bir "telefon numarası gerekli" metni
 * kullanıcıya alanı doldurduğu hâlde "boş" diyordu. Ülke kodu adresin kendi
 * `phoneCountryCode`'undan okunur (yoksa `+90`).
 */
/**
 * Adres telefonunun hata mesajı — TEK kaynak.
 *
 * Boş alan ile çözülemeyen numara farklı hatalar: alanı hiç doldurmamış
 * kullanıcıya biçim açıklaması göstermek yanlış yönlendiriyor. İki katman
 * (form doğrulaması ve ödeme öncesi telefon çözümlemesi) buradan konuşur ki
 * aynı boş alan iki farklı cümle üretmesin.
 */
export const addressPhoneError = (
  phone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
  label = i18n.t('checkout.shippingAddressLabel'),
): string | null => {
  if (!phone.trim()) return i18n.t('checkout.addressPhoneRequired', { label });
  if (!isValidPhoneInput(phone, countryCode)) return i18n.t('checkout.addressPhoneInvalid', { label, message: getPhoneInvalidMessage() });
  return null;
};

export const validateInlineAddress = (a: ShippingAddressInput, label = i18n.t('checkout.shippingAddressLabel')): string | null => {
  if (!a.fullName.trim()) return i18n.t('checkout.addressFullNameRequired', { label });
  const phoneError = addressPhoneError(a.phone, a.phoneCountryCode ?? DEFAULT_COUNTRY_CODE, label);
  if (phoneError) return phoneError;
  if (!a.city.trim()) return i18n.t('checkout.addressCityRequired', { label });
  if (!a.district.trim()) return i18n.t('checkout.addressDistrictRequired', { label });
  if (!a.address.trim()) return i18n.t('checkout.addressLineRequired', { label });
  return null;
};
