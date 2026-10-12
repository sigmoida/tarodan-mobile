// İade talebi formunun zod şeması (colocated).
import type { TFunction } from 'i18next';
import { z } from 'zod';

/** Açıklama zorunluysa en az bu kadar karakter (web ile aynı eşik). */
export const REFUND_DESCRIPTION_MIN = 20;

/**
 * Hangi alan zorunlu — sunucunun iade politikasıyla AYNI karar.
 *
 * Kanıt: `changed_mind` dışındaki her neden kanıt ister. Teslim sonrası
 * `resolveReturnPolicy` kusur/manuel inceleme politikalarına düşer;
 * `requiresEvidence` true, kanıtsız istek `server.refund.evidenceRequired`
 * ile 400 alır (`refund-creation.service.ts`, `helpers/refund-financial-policy.ts`).
 * Açıklama: web'deki gibi kanıt isteyen nedende zorunlu.
 *
 * Faz YOK: modal yalnız kargo sonrası VE iade penceresi içindeyken açılıyor
 * (`OrderRefundActionCard` kapısı). Web'in `preparing` (kargo öncesi — mobilde
 * iptal formu) ve `past_cooling_off` (pencere kapalı — mobilde kart bilgi
 * gösterir) fazları bu ekrandan erişilemez; kuralları da burada yok. Kapı
 * değişirse (ör. pencere sonrası itiraz) faz buraya geri eklenmeli.
 */
export function refundRequirements(reason: string) {
  const evidenceRequired = reason !== 'changed_mind';
  return {
    evidenceRequired,
    descriptionRequired: evidenceRequired,
  };
}

export function refundRequestSchema(t: TFunction) {
  return z
    .object({
      reason: z.string().min(1, t('validation.required')),
      description: z.string(),
      evidenceCount: z.number().int().min(0),
    })
    .superRefine((v, ctx) => {
      const req = refundRequirements(v.reason);
      if (req.descriptionRequired && v.description.trim().length < REFUND_DESCRIPTION_MIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['description'],
          message: t('order.descriptionMin20'),
        });
      }
      if (req.evidenceRequired && v.evidenceCount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceCount'],
          message: t('order.photoEvidenceRequired'),
        });
      }
    });
}

export type RefundRequestInput = z.input<ReturnType<typeof refundRequestSchema>>;

/** Modalın satır içi gösterdiği hatalar (alan → ilk mesaj). */
export type RefundFormErrors = Partial<Record<'reason' | 'description' | 'evidence', string>>;

/** Şemayı çalıştırır, hataları modalın alanlarına eşler. Geçerliyse `{}`. */
export function validateRefundRequest(input: RefundRequestInput, t: TFunction): RefundFormErrors {
  const parsed = refundRequestSchema(t).safeParse(input);
  if (parsed.success) return {};
  const errors: RefundFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] === 'evidenceCount' ? 'evidence' : (issue.path[0] as keyof RefundFormErrors);
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
