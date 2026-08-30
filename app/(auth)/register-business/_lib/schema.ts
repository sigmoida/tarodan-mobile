/**
 * `BusinessRegisterDto` (backend) — canlıda doğrulandı (task-3-report.md):
 * yalnız bu sekiz alan kabul edilir, `password` YOK (bu adım hesap açmaz, ön
 * başvurudur — kullanıcı adı/şifre admin onayı sonrası davet e-postasıyla
 * `corporate-invite` akışında belirlenir).
 *
 * Telefon ayrıştırma paylaşılan `@/utils/validation` + `@/utils/phone`'da — alan
 * formatlayıcısıyla TEK KAYNAK (route-local `_lib/phone.ts` kopyası emekli edildi;
 * aynı girdiye iki farklı cevap veren iki telefon davranışı kalmadı, §5).
 */
import { z } from 'zod';
import type { TFunction } from 'i18next';
import {
  emailSchema,
  requiredTrPhoneSchema,
  optionalTrPhoneSchema,
} from '@/utils/validation';

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildRegisterBusinessSchema = (t: TFunction) => {
  /**
   * `emailSchema` (tek kaynak: trim + format) üstüne **route-local** küçük harf
   * dönüşümü: davet e-postası eşleşmesi büyük/küçük harfe takılmasın. Paylaşılan
   * `emailSchema`'nın davranışı değiştirilmez (başka çağıranları var).
   */
  const email = emailSchema(t);
  const loweredEmailSchema = email.transform((v) => v.toLowerCase());

  return z.object({
    authorizedFullName: z
      .string()
      .trim()
      .min(2, t('validation.minLength', { min: 2 }))
      .max(120, t('validation.maxLength', { max: 120 })),
    companyLegalName: z
      .string()
      .trim()
      .min(2, t('validation.minLength', { min: 2 }))
      .max(240, t('validation.maxLength', { max: 240 })),
    companyTitle: z
      .string()
      .trim()
      .min(2, t('validation.minLength', { min: 2 }))
      .max(200, t('validation.maxLength', { max: 200 })),
    companyAddress: z
      .string()
      .trim()
      .min(10, t('validation.minLength', { min: 10 }))
      .max(500, t('validation.maxLength', { max: 500 })),
    companyEmail: loweredEmailSchema,
    /**
     * KEP kurumsal tebligat adresi: başvurunun yasal iletişim kanalı, bu
     * yüzden zorunlu (web: `apps/web/.../_lib/auth.ts:186`, aynı şekil —
     * `trim().min(1, …).email(…)`, lowercase dönüşümü YOK). Sunucu DTO'da
     * `kepAddress?: string` (opsiyonel) kalsa da bu zorunluluk üründe
     * bilinçli bir karar: mobil web'le eşleşir.
     */
    kepAddress: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
    phone: requiredTrPhoneSchema(t),
    contactPhone: optionalTrPhoneSchema(t),
    /** Client-only kapı — API'ye GÖNDERİLMEZ (DTO'da böyle bir alan yok). */
    acceptTerms: z.boolean().refine((v) => v === true, t('validation.acceptBusinessTerms')),
  });
};

/** Form değerleri (RHF/useZodForm) — telefon/e-posta transform ÖNCESİ ham string. */
export type RegisterBusinessFormInput = z.input<ReturnType<typeof buildRegisterBusinessSchema>>;
/** `handleSubmit` çıktısı — telefon E.164'e normalize edilmiş, opsiyonel alanlar undefined/dolu. */
export type RegisterBusinessForm = z.output<ReturnType<typeof buildRegisterBusinessSchema>>;
