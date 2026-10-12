// İade talebi formunun zod şeması (colocated).
import type { TFunction } from 'i18next';
import { z } from 'zod';
import type { RNFile } from '@/lib/api';

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

/** Formun başlangıç değerleri — açılışta ve kapatınca hepsi buna döner. */
export function refundFormDefaults(): RefundFormValues {
  return { reason: 'changed_mind', description: '', evidence: [], quantity: 1 };
}

/**
 * İade formunun şeması (`useZodForm`). Kanıt fotoğrafları da formun alanı —
 * kapatınca `reset` neden/açıklama/adet/kanıtın hepsini birlikte sıfırlar.
 */
export function refundRequestSchema(t: TFunction) {
  return z
    .object({
      reason: z.string().min(1, t('validation.required')),
      description: z.string(),
      evidence: z.array(z.custom<RNFile>()),
      quantity: z.number().int().min(1),
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
      if (req.evidenceRequired && v.evidence.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidence'],
          message: t('order.photoEvidenceRequired'),
        });
      }
    });
}

export type RefundFormValues = z.input<ReturnType<typeof refundRequestSchema>>;

/** `POST /orders/:id/refund` gövdesi — formdan ve yüklenen kanıt URL'lerinden. */
export function buildRefundBody(
  values: RefundFormValues,
  orderQuantity: number,
  evidencePhotoUrls: string[],
): { reason: string; description?: string; evidencePhotoUrls?: string[]; refundQuantity?: number } {
  const body: ReturnType<typeof buildRefundBody> = { reason: values.reason };
  const desc = values.description.trim();
  if (desc.length > 0) body.description = desc;
  if (orderQuantity > 1 && values.quantity < orderQuantity) body.refundQuantity = values.quantity;
  if (evidencePhotoUrls.length > 0) body.evidencePhotoUrls = evidencePhotoUrls;
  return body;
}
