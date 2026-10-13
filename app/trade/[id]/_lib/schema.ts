// Takas itirazı formunun zod şeması (colocated).
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { DEFAULT_DISPUTE_REASON, DISPUTE_REASONS } from './disputeReasons';

/** Açıklama kırpılmış hâliyle en az bu kadar karakter (web `RaiseDisputeModal` ile aynı). */
export const DISPUTE_DESCRIPTION_MIN = 10;
/** Web ile aynı üst sınır. */
export const DISPUTE_DESCRIPTION_MAX = 1000;

export function disputeSchema(t: TFunction) {
  return z.object({
    reason: z.enum(DISPUTE_REASONS),
    description: z
      .string()
      .refine((v) => v.trim().length >= DISPUTE_DESCRIPTION_MIN, t('trade.dispute.minLengthError')),
  });
}

export type DisputeFormValues = z.input<ReturnType<typeof disputeSchema>>;

/** Ekran her açılışta varsayılan nedenle başlar; açıklama taslaktan gelir. */
export const disputeFormDefaults = (draft: string): DisputeFormValues => ({
  reason: DEFAULT_DISPUTE_REASON,
  description: draft,
});

/** `POST /trades/:id/dispute` gövdesi — açıklama kırpılır (eski akışla aynı). */
export const disputeBody = (v: DisputeFormValues) => ({ reason: v.reason, description: v.description.trim() });
