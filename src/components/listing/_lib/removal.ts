import type { TFunction } from 'i18next';
import { z } from 'zod';
import type { MessageKey } from '@/i18n/lib';
import type { ListingRemovalPayload } from '@/lib/api';

/**
 * İlan KALDIRMA nedeni — satıcı formu kuralı. Kaynak: tarodan-app
 * `packages/types/src/listing-removal.ts` (`listingRemovalIssue`, seller aktörü)
 * ve `apps/web/.../ListingRemovalModal` + `listingRemovalSchema`. API aynı
 * kuralı çalıştırır; form sunucunun reddedeceği bir şeyi kabul etmesin diye
 * burada birebir tutulur. Etiketler katalog anahtarıdır (`status.listingRemoval.*`),
 * metin burada yazılmaz.
 */

/** Satıcının ilanı sahneden indirmenin iki yolu. */
export type SellerRemovalAction = 'delete' | 'deactivate';

/** Ekran sırasıyla; geçici duraklatma YALNIZ pasife almada vardır (silinen ilan geri gelmez). */
export const SELLER_REMOVAL_REASONS: Record<SellerRemovalAction, readonly string[]> = {
  delete: ['changed_mind', 'sold_elsewhere'],
  deactivate: ['changed_mind', 'sold_elsewhere', 'paused_temporarily'],
};

export const REMOVAL_PLATFORMS = [
  'letgo',
  'instagram',
  'dolap',
  'sahibinden',
  'in_person',
  'other',
] as const;

export const REMOVAL_DETAIL_MAX_LENGTH = 500;

export const reasonLabelKey = (reason: string) =>
  `status.listingRemoval.reason.${reason}` as MessageKey;
export const platformLabelKey = (platform: string) =>
  `status.listingRemoval.platform.${platform}` as MessageKey;

/** Ham form durumu — her kontrol string (boş = seçilmedi). */
export interface ListingRemovalValues {
  reason: string;
  platform: string;
  detail: string;
}

export const EMPTY_LISTING_REMOVAL: ListingRemovalValues = {
  reason: '',
  platform: '',
  detail: '',
};

/**
 * Form → API gövdesi. Platform yalnız "başka platformda sattım"a aittir:
 * neden değiştirilmeden önce seçilmiş platform gönderilmez. Metin kırpılır,
 * boş string `undefined` olur.
 */
export function toRemovalPayload(values: ListingRemovalValues): ListingRemovalPayload {
  const reason = values.reason.trim();
  const platform = reason === 'sold_elsewhere' ? values.platform.trim() : '';
  const detail = values.detail.trim();
  return {
    removalReason: reason || undefined,
    removalPlatform: platform || undefined,
    removalDetail: detail || undefined,
  };
}

export type RemovalIssue =
  | 'reason_required'
  | 'reason_not_allowed'
  | 'platform_required'
  | 'platform_invalid'
  | 'platform_not_allowed'
  | 'detail_required'
  | 'detail_too_long';

/** Sorunun hangi kontrolün altında gösterileceği. */
export const ISSUE_FIELD: Record<RemovalIssue, keyof ListingRemovalValues> = {
  reason_required: 'reason',
  reason_not_allowed: 'reason',
  platform_required: 'platform',
  platform_invalid: 'platform',
  platform_not_allowed: 'platform',
  detail_required: 'detail',
  detail_too_long: 'detail',
};

/** TEK kural (satıcı): `null` = geçerli. Sıra önemli — ilk sorun gösterilir. */
export function removalIssue(
  action: SellerRemovalAction,
  payload: ListingRemovalPayload,
): RemovalIssue | null {
  const { removalReason: reason, removalPlatform: platform, removalDetail: detail } = payload;
  if (!reason) return 'reason_required';
  if (!SELLER_REMOVAL_REASONS[action].includes(reason)) return 'reason_not_allowed';
  if (detail && detail.length > REMOVAL_DETAIL_MAX_LENGTH) return 'detail_too_long';
  if (reason === 'sold_elsewhere') {
    if (!platform) return 'platform_required';
    if (!(REMOVAL_PLATFORMS as readonly string[]).includes(platform)) return 'platform_invalid';
    if (platform === 'other' && !detail) return 'detail_required';
  } else if (platform) {
    return 'platform_not_allowed';
  }
  return null;
}

/** Satıcı kaldırma formu şeması — doğrulama, API'nin alacağı gövde üzerinde çalışır. */
export const listingRemovalSchema = (t: TFunction, action: SellerRemovalAction) =>
  z
    .object({ reason: z.string(), platform: z.string(), detail: z.string() })
    .superRefine((values, ctx) => {
      const issue = removalIssue(action, toRemovalPayload(values));
      if (!issue) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [ISSUE_FIELD[issue]],
        message: t(`validation.listingRemoval.${issue}`, {
          max: REMOVAL_DETAIL_MAX_LENGTH,
        }),
      });
    });
