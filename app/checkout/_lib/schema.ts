import { z } from 'zod';
import { DEFAULT_COUNTRY_CODE } from '@/utils/phone';

/**
 * Misafir iletişim alanları (ad, e-posta, telefon + ülke kodu).
 *
 * Form durumu RHF'de tutulur ki tuş vuruşu yalnız ilgili alanı (Controller) yeniden çizsin — tüm
 * checkout'u değil. Şema bilerek KURALSIZ: doğrulamanın tek kaynağı `validateGuest`
 * (`_lib/validation`) ve ödeme düğmesinde toast ile çalışır; `handleSubmit` çağrılmaz, değerler
 * gönderim anında `getValues()` ile okunur.
 */
export const guestContactSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  phoneCountryCode: z.string(),
});

export type GuestContactValues = z.input<typeof guestContactSchema>;

export const GUEST_CONTACT_DEFAULTS: GuestContactValues = {
  name: '',
  email: '',
  phone: '',
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
};
