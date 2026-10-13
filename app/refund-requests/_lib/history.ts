// İade talebi zaman çizelgesi (`metadata.history[].action`) etiketleri — TEK kaynak.
import type { TFunction } from 'i18next';
import type { MessageKey } from '@/i18n/lib';

/**
 * Sunucunun yazdığı aksiyon adı → katalog anahtarı.
 *
 * Liste `apps/api/src/modules/refund/*` içindeki `appendHistory` çağrılarından
 * çıkarıldı (kargo öncesi iptal, yönetici kararları, süre dolumları dahil).
 * Eskiden yalnız yedi aksiyon etiketliydi; kalanlar ekranda ham adla
 * (`cancellation_refunded`) görünüyordu. `accepted_by_seller`,
 * `rejected_by_seller`, `policy_overridden`, `return_shipping_payer_changed`,
 * `dispute_resolved_*` artık yazılmıyor ama eski kayıtlarda duruyor.
 */
export const REFUND_HISTORY_ACTION_KEYS: Record<string, MessageKey> = {
  return_opened: 'refund.history.returnOpened',
  refund_completed: 'refund.history.refundCompleted',
  cancelled_by_buyer: 'refund.history.cancelledByBuyer',
  cancellation_refunded: 'refund.history.cancellationRefunded',
  cancellation_pending_admin_review: 'refund.history.cancellationPendingReview',
  pending_admin_review: 'refund.history.pendingAdminReview',
  approved_by_admin: 'refund.history.approvedByAdmin',
  approved_and_refunded_by_admin: 'refund.history.approvedAndRefundedByAdmin',
  rejected_by_admin: 'refund.history.rejectedByAdmin',
  closed_by_admin: 'refund.history.closedByAdmin',
  marked_disputed: 'refund.history.markedDisputed',
  financial_review_finalized: 'refund.history.financialReviewFinalized',
  return_dropoff_expired: 'refund.history.returnDropoffExpired',
  wait_for_delivery_expired: 'refund.history.waitForDeliveryExpired',
  // Eski kayıtlar
  accepted_by_seller: 'refund.history.acceptedBySeller',
  rejected_by_seller: 'refund.history.rejectedBySeller',
  policy_overridden: 'refund.history.policyOverridden',
  return_shipping_payer_changed: 'refund.history.payerChanged',
  dispute_resolved_approve: 'refund.history.disputeApproved',
  dispute_resolved_reject: 'refund.history.disputeRejected',
};

/** Aksiyon adı boşsa gösterilen yer tutucu (eski ekranla aynı — etiket uydurulmaz). */
export const EMPTY_HISTORY_ACTION = '—';

/**
 * Aksiyonun okunur etiketi. Bilinmeyen (sunucuya sonradan eklenen) bir aksiyon
 * ham adıyla DEĞİL genel "Talep güncellendi" ile basılır. Aksiyon BOŞSA
 * (null/undefined/boş metin) bir şey olduğu iddia edilmez: '—'.
 */
export function refundHistoryActionLabel(action: string | null | undefined, t: TFunction): string {
  if (!action?.trim()) return EMPTY_HISTORY_ACTION;
  return t(REFUND_HISTORY_ACTION_KEYS[action] ?? 'refund.history.unknown');
}
