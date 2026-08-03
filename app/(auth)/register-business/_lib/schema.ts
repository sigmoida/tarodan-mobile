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
import {
  emailSchema,
  requiredTrPhoneSchema,
  optionalTrPhoneSchema,
} from '@/utils/validation';

/**
 * `emailSchema` (tek kaynak: trim + format) üstüne **route-local** küçük harf
 * dönüşümü: davet e-postası eşleşmesi büyük/küçük harfe takılmasın. Paylaşılan
 * `emailSchema`'nın davranışı değiştirilmez (başka çağıranları var).
 */
const loweredEmailSchema = emailSchema.transform((v) => v.toLowerCase());

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const parsed = emailSchema.safeParse(v);
    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Geçerli bir e-posta girin' });
      return z.NEVER;
    }
    return parsed.data.toLowerCase();
  });

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
  companyEmail: loweredEmailSchema,
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
