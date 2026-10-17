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
 * API `CreateAddressDto` sınırları (tek yer; sunucu 400'ü istemcide yakalansın):
 * başlık ≤ 50 (sunucuda opsiyonel; mobil formda zorunlu kalır), ad soyad 2–100,
 * adres 10–500, il/ilçe zorunlu (≤ 50, listeden seçilir), posta kodu ≤ 10.
 */
export const ADDRESS_LIMITS = {
  titleMax: 50,
  fullNameMin: 2,
  fullNameMax: 100,
  addressMin: 10,
  addressMax: 500,
  zipCodeMax: 10,
} as const;

/**
 * Adres formu şeması (colocated, src/ui/CLAUDE.md › Forms), API DTO'suyla hizalı (`ADDRESS_LIMITS`):
 * başlık / ad soyad / telefon / adres / il / ilçe zorunlu; telefon `@/utils/phone`
 * ayrıştırıcısıyla (TEK KAYNAK — alanın blur uyarısı da aynı kuralı kullanır).
 * Hatalar `superRefine` ile alan yoluna bağlanır: ilgili girdinin (il/ilçe dahil) altında görünür.
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
      const L = ADDRESS_LIMITS;
      const min = (n: number) => t('validation.minLength', { min: n });
      const max = (n: number) => t('validation.maxLength', { max: n });

      const title = v.title.trim();
      if (!title) fail('title', required);
      else if (title.length > L.titleMax) fail('title', max(L.titleMax));
      const fullName = v.fullName.trim();
      if (!fullName) fail('fullName', required);
      else if (fullName.length < L.fullNameMin) fail('fullName', min(L.fullNameMin));
      else if (fullName.length > L.fullNameMax) fail('fullName', max(L.fullNameMax));
      // Sıkı TR ayrıştırma — kırpma/tahmin yok. Sunucu yalnız `+905…` kabul
      // ediyor (`IsTrPhone`); `isValidPhoneInput` TR dışı her kodda `false`.
      if (!v.phone.trim()) fail('phone', required);
      else if (!isValidPhoneInput(v.phone, v.phoneCountryCode)) fail('phone', getPhoneInvalidMessage());
      const address = v.address.trim();
      if (!address) fail('address', required);
      else if (address.length < L.addressMin) fail('address', min(L.addressMin));
      else if (address.length > L.addressMax) fail('address', max(L.addressMax));
      if (!v.city) fail('city', t('validation.selectCity'));
      if (!v.district) fail('district', t('validation.selectDistrict'));
      if (v.postalCode.trim().length > L.zipCodeMax) fail('postalCode', max(L.zipCodeMax));
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

/** Form sırasıyla alanlar ve etiketleri (özet satırı için). */
const FIELD_LABELS = [
  ['title', 'address.addressTitleLabel'],
  ['fullName', 'address.fullName'],
  ['phone', 'address.phone'],
  ['address', 'address.address'],
  ['city', 'address.city'],
  ['district', 'address.district'],
  ['postalCode', 'address.zipCode'],
] as const;

/**
 * Gönderim reddedilince alt çubukta (Kaydet'in üstünde, her zaman görünür) tek
 * satırlık özet: hatalı alan kaydırmalı formda ekran dışında kalabilir — hangi
 * alanların eksik/hatalı olduğunu ADIYLA söyler; ayrıntı alanın altında.
 */
export function addressErrorSummary(errors: FieldErrors<AddressFormValues>, t: TFunction): string {
  const fields = FIELD_LABELS.filter(([key]) => errors[key]).map(([, label]) => t(label));
  return t('address.checkFields', { fields: fields.join(', ') });
}
