import { z } from 'zod';
import { emailSchema } from '@/utils/validation';
import { DEFAULT_COUNTRY_CODE, formatPhoneNumber, normalizePhoneForPayload } from '@/utils/phone';

/**
 * `BusinessRegisterDto` (backend) — canlıda doğrulandı (task-3-report.md):
 * yalnız bu sekiz alan kabul edilir, `password` YOK (bu adım hesap açmaz, ön
 * başvurudur — kullanıcı adı/şifre admin onayı sonrası davet e-postasıyla
 * `corporate-invite` akışında belirlenir).
 */
const TR_PHONE_REGEX = /^\+90[0-9]{10}$/;

/**
 * Ham telefon girdisini ("0532…", "532…", "+90 532…") E.164 TR biçimine
 * normalize eder. Mevcut telefon yardımcılarını (PhoneInput'un kullandığı aynı
 * çift adım) kompoze eder — bir daha implemente etmez (CLAUDE.md §5 DRY):
 * `formatPhoneNumber` başındaki "0"/"90" prefix'ini söker ve gruplar,
 * `normalizePhoneForPayload` ülke kodunu ekler.
 */
function toE164TrPhone(raw: string): string {
  return normalizePhoneForPayload(
    formatPhoneNumber(raw, DEFAULT_COUNTRY_CODE),
    DEFAULT_COUNTRY_CODE,
  );
}

const requiredTrPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Telefon numarası gerekli')
  .transform(toE164TrPhone)
  .refine((v) => TR_PHONE_REGEX.test(v), 'Geçerli bir telefon numarası girin (5XX XXX XX XX)');

const optionalTrPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? toE164TrPhone(v) : undefined))
  .refine((v) => v === undefined || TR_PHONE_REGEX.test(v), 'Geçerli bir telefon numarası girin (5XX XXX XX XX)');

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || z.string().email().safeParse(v).success,
    'Geçerli bir e-posta girin',
  );

export const registerBusinessSchema = z.object({
  authorizedFullName: z
    .string()
    .trim()
    .min(2, 'En az 2 karakter olmalı')
    .max(120, 'En fazla 120 karakter olabilir'),
  companyLegalName: z
    .string()
    .trim()
    .min(2, 'En az 2 karakter olmalı')
    .max(240, 'En fazla 240 karakter olabilir'),
  companyTitle: z
    .string()
    .trim()
    .min(2, 'En az 2 karakter olmalı')
    .max(200, 'En fazla 200 karakter olabilir'),
  companyAddress: z
    .string()
    .trim()
    .min(10, 'En az 10 karakter olmalı')
    .max(500, 'En fazla 500 karakter olabilir'),
  companyEmail: emailSchema,
  kepAddress: optionalEmailSchema,
  phone: requiredTrPhoneSchema,
  contactPhone: optionalTrPhoneSchema,
  /** Client-only kapı — API'ye GÖNDERİLMEZ (DTO'da böyle bir alan yok). */
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, 'Üyelik sözleşmesini ve KVKK aydınlatma metnini kabul etmelisiniz'),
});

/** Form değerleri (RHF/useZodForm) — telefon/e-posta transform ÖNCESİ ham string. */
export type RegisterBusinessFormInput = z.input<typeof registerBusinessSchema>;
/** `handleSubmit` çıktısı — telefon E.164'e normalize edilmiş, opsiyonel alanlar undefined/dolu. */
export type RegisterBusinessForm = z.output<typeof registerBusinessSchema>;
