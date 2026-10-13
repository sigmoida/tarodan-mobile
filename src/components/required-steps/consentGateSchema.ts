import { z } from 'zod';
import {
  CONSENT_DOCUMENT_KEYS,
  canSubmitConsents,
  type PendingConsent,
} from '@/lib/shared/legalConsent';

/**
 * Onay kapısı formunun şeması (CLAUDE.md §7). İşaretli belgeler `accepted`
 * dizisinde; şema bekleyen belgelerin HEPSİ işaretlenmeden geçmez. Bekleyen
 * liste sunucudan geldiği için şema bir factory: liste değişince yeniden
 * üretilir. Gönder düğmesi de aynı şemadan beslenir (`safeParse`), kural tek
 * yerde.
 */
export function consentGateSchema(pending: readonly PendingConsent[]) {
  return z
    .object({ accepted: z.array(z.enum(CONSENT_DOCUMENT_KEYS)) })
    .refine((v) => canSubmitConsents(pending, new Set(v.accepted)), {
      path: ['accepted'],
      message: 'legal.consentGate.mustAcceptAll',
    });
}

export type ConsentGateValues = z.input<ReturnType<typeof consentGateSchema>>;
