import type { TFunction } from 'i18next';
import type { FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import {
  DEFAULT_COUNTRY_CODE,
  getPhoneInvalidMessage,
  isValidPhoneInput,
  splitPhone,
} from '@/utils/phone';
import type { Address } from './types';

/**
 * Adres formu şeması (colocated, CLAUDE.md §7). Kurallar eski elle yazılmış
 * `handleSubmit` ile AYNI ve API DTO'suyla hizalı: başlık / ad soyad / telefon /
 * adres / il / ilçe zorunlu; adres ≥ 10 karakter; telefon `@/utils/phone`
 * ayrıştırıcısıyla (TEK KAYNAK — alanın blur uyarısı da aynı kuralı kullanır).
 * Hatalar `superRefine` ile alan yoluna bağlanır: ilgili girdinin altında görünür.
 */
export function addressSchema(t: TFunction) {
  return z
    .object({
      title: z.string(),
      fullName: z.string(),
      phone: z.string(),
      phoneCountryCode: z.string(),
      address: z.string(),
      city: z.string(),
      district: z.string(),
      postalCode: z.string(),
      isDefault: z.boolean(),
    })
    .superRefine((v, ctx) => {
      const fail = (path: keyof typeof v, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });
      const required = t('validation.required');

      if (!v.title.trim()) fail('title', required);
      if (!v.fullName.trim()) fail('fullName', required);
      // Sıkı TR ayrıştırma — kırpma/tahmin yok. Sunucu yalnız `+905…` kabul
      // ediyor (`IsTrPhone`); `isValidPhoneInput` TR dışı her kodda `false`.
      if (!v.phone.trim()) fail('phone', required);
      else if (!isValidPhoneInput(v.phone, v.phoneCountryCode)) fail('phone', getPhoneInvalidMessage());
      if (!v.address.trim()) fail('address', required);
      else if (v.address.trim().length < 10) fail('address', t('validation.minLength', { min: 10 }));
      if (!v.city) fail('city', required);
      if (!v.district) fail('district', required);
    });
}

export type AddressFormValues = z.input<ReturnType<typeof addressSchema>>;

export const addressDefaultValues = (): AddressFormValues => ({
  title: '',
  fullName: '',
  phone: '',
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
  address: '',
  city: '',
  district: '',
  postalCode: '',
  isDefault: false,
});

/** Düzenleme: kayıttaki adresten form değerleri (telefon kod + yerel numaraya bölünür). */
export const addressToFormValues = (address: Address): AddressFormValues => {
  const { countryCode, phone } = splitPhone(address.phone);
  return {
    title: address.title,
    fullName: address.fullName,
    phone,
    phoneCountryCode: countryCode,
    address: address.address,
    city: address.city,
    district: address.district,
    // API `zipCode` döndürüyor; eski kayıtlarda `postalCode` olabilir.
    postalCode: address.zipCode ?? address.postalCode ?? '',
    isDefault: address.isDefault,
  };
};

const REQUIRED_FIELDS = ['title', 'fullName', 'phone', 'address', 'city', 'district'] as const;

/**
 * Gönderim reddedilince alt çubukta (Kaydet'in üstünde, her zaman görünür) tek
 * satırlık özet: hatalı alan kaydırmalı formda ekran dışında kalabilir.
 * Öncelik eski formla aynı: eksik zorunlu alan → adres kısa → telefon.
 */
export function addressErrorSummary(errors: FieldErrors<AddressFormValues>, t: TFunction): string {
  const required = t('validation.required');
  if (REQUIRED_FIELDS.some((k) => errors[k]?.message === required)) {
    return t('address.fillRequiredFields');
  }
  if (errors.address) return t('address.addressMinLength');
  // Alanın altındaki mesajla AYNI metin — iki yerde iki farklı kural anlatılmasın.
  return errors.phone?.message ?? getPhoneInvalidMessage();
}
