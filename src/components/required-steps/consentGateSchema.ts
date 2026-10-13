import { z } from 'zod';
import { canSubmitConsents, type PendingConsent } from '@/lib/shared/legalConsent';

/**
 * Onay kapısı formunun şeması (CLAUDE.md §7). İşaretli belgeler `accepted`
 * dizisinde, belge + sürüm anahtarıyla (`consentCheckKey`, ör.
 * `terms@2026-08-05`): yeni sürüm gelince eski işaret onu karşılamaz; şema bekleyen belgelerin HEPSİ işaretlenmeden geçmez. Bekleyen
 * liste sunucudan geldiği için şema bir factory: liste değişince yeniden
 * üretilir. Gönder düğmesi de aynı şemadan beslenir (`safeParse`), kural tek
 * yerde.
 */
export function consentGateSchema(pending: readonly PendingConsent[]) {
  return z
    .object({ accepted: z.array(z.string()) })
    .refine((v) => canSubmitConsents(pending, new Set(v.accepted)), {
      path: ['accepted'],
      message: 'legal.consentGate.mustAcceptAll',
    });
}

export type ConsentGateValues = z.input<ReturnType<typeof consentGateSchema>>;
