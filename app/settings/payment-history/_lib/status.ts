import type { TFunction } from 'i18next';
import { formatPrice } from '@/utils/format';
import { buildPaymentStatusConfig } from '@/lib/payment/status';
import { statusVariantSolid } from '@/lib/shared/status-colors';
import type { StatusConfig } from '@/lib/shared/status-configs';

/** Satır başındaki durum ikonu (foto yokken) — işlevsel; rozet ikon taşımaz. */
const STATUS_ICON: Record<string, string> = {
  completed: 'checkmark-circle',
  paid: 'checkmark-circle',
  success: 'checkmark-circle',
  hold_payment: 'checkmark-circle',
  failed: 'close-circle',
  pending: 'time',
  processing: 'time',
  // İade edilen ödeme "Bekliyor" değil, açıkça "İade Edildi" gösterilmeli (web ile tutarlı).
  refunded: 'arrow-undo',
  refund_requested: 'time',
  cancelled: 'close-circle',
};

export type PaymentHistoryStatus = StatusConfig & { color: string; icon: string };

/**
 * Renk + etiket web `paymentStatusConfig` ile aynı (`@/lib/payment/status`);
 * `color` aynı varyanttan türetilir (satır ikonu için), ayrı renk tablosu yok.
 */
export const buildStatusConfig = (t: TFunction): Record<string, PaymentHistoryStatus> =>
  Object.fromEntries(
    Object.entries(buildPaymentStatusConfig(t)).map(([status, cfg]) => [
      status,
      { ...cfg, color: statusVariantSolid(cfg.variant), icon: STATUS_ICON[status] ?? 'time' },
    ]),
  );

// Not: tarih/tutar formatı bilerek 'tr-TR' — @/utils/format.formatPrice ile aynı
// yerleşik kararı izliyor (uygulama genelinde para/tarih formatı sabit TL/tr-TR).
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number): string {
  return formatPrice(amount);
}
