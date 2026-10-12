// İade talebi formunun zod şeması (colocated). Faz runtime'da (sipariş) belli
// olduğundan şema bir factory ile üretilir.
import type { TFunction } from 'i18next';
import { z } from 'zod';

/** Talebin açıldığı faz — web `inferRefundPhase` ile aynı üç değer. */
export type RefundPhase = 'preparing' | 'in_cooling_off' | 'past_cooling_off';

/** Açıklama zorunluysa en az bu kadar karakter (web ile aynı eşik). */
export const REFUND_DESCRIPTION_MIN = 20;

/**
 * Hangi alan zorunlu — sunucunun iade politikasıyla AYNI karar.
 *
 * Kanıt: `changed_mind` dışındaki her neden kanıt ister, faz FARK ETMEZ.
 * Sunucuda kargo öncesi `changed_mind` dışı nedenler "other" olarak
 * `manual_review_cancellation`'a, teslim sonrası `resolveReturnPolicy`'de
 * kusur/manuel inceleme politikalarına düşer — ikisinde de `requiresEvidence`
 * true; kanıtsız istek `server.refund.evidenceRequired` ile 400 alır.
 * (`refund-creation.service.ts`, `helpers/refund-financial-policy.ts`.)
 *
 * Açıklama ve neden: web'deki gibi — kanıt isteyen nedenlerde ve cayma süresi
 * geçmiş (dispute) talepte açıklama zorunlu; neden yalnız dispute'ta zorunlu
 * etiketlenir.
 */
export function refundRequirements(reason: string, phase: RefundPhase) {
  const evidenceRequired = reason !== 'changed_mind';
  const isDispute = phase === 'past_cooling_off';
  return {
    evidenceRequired,
    descriptionRequired: isDispute || evidenceRequired,
    reasonRequired: isDispute,
  };
}

export function refundRequestSchema(phase: RefundPhase, t: TFunction) {
  return z
    .object({
      reason: z.string().min(1, t('validation.required')),
      description: z.string(),
      evidenceCount: z.number().int().min(0),
    })
    .superRefine((v, ctx) => {
      const req = refundRequirements(v.reason, phase);
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
export function validateRefundRequest(
  input: RefundRequestInput,
  phase: RefundPhase,
  t: TFunction,
): RefundFormErrors {
  const parsed = refundRequestSchema(phase, t).safeParse(input);
  if (parsed.success) return {};
  const errors: RefundFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] === 'evidenceCount' ? 'evidence' : (issue.path[0] as keyof RefundFormErrors);
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
