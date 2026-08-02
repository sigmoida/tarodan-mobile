import { DEFAULT_COUNTRY_CODE, isValidPhoneInput, PHONE_INVALID_MESSAGE } from '@/utils/phone';
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
  if (!name.trim()) return 'Lütfen adınızı girin';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Geçerli bir e-posta adresi girin';
  if (!phone.trim()) return 'Lütfen telefon numaranızı girin';
  if (!isValidPhoneInput(phone, countryCode)) return PHONE_INVALID_MESSAGE;
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
export const validateInlineAddress = (a: ShippingAddressInput, label = 'Teslimat'): string | null => {
  if (!a.fullName.trim()) return `${label} adresi için ad soyad gerekli`;
  if (!a.phone.trim()) return `${label} adresi için telefon numarası gerekli`;
  if (!isValidPhoneInput(a.phone, a.phoneCountryCode ?? DEFAULT_COUNTRY_CODE))
    return `${label} adresi — ${PHONE_INVALID_MESSAGE}`;
  if (!a.city.trim()) return `${label} adresi için il seçin`;
  if (!a.district.trim()) return `${label} adresi için ilçe seçin`;
  if (!a.address.trim()) return `${label} adresi için açık adres girin`;
  return null;
};
