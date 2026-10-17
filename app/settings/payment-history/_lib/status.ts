import type { TFunction } from 'i18next';
import type { IconName } from '@/ui';
import { formatPrice } from '@/utils/format';
import { buildPaymentStatusConfig } from '@/lib/payment/status';
import { statusVariantSolid } from '@/lib/shared/status-colors';
import type { StatusConfig } from '@/lib/shared/status-configs';

/** Satır başındaki durum ikonu (foto yokken) — işlevsel; rozet ikon taşımaz. */
const STATUS_ICON: Record<string, IconName> = {
  completed: 'check-circle',
  paid: 'check-circle',
  success: 'check-circle',
  hold_payment: 'check-circle',
  failed: 'x-circle',
  pending: 'clock',
  processing: 'clock',
  // İade edilen ödeme "Bekliyor" değil, açıkça "İade Edildi" gösterilmeli (web ile tutarlı).
  refunded: 'arrow-uturn-left',
  refund_requested: 'clock',
  cancelled: 'x-circle',
};

export type PaymentHistoryStatus = StatusConfig & { color: string; icon: IconName };

/**
 * Renk + etiket web `paymentStatusConfig` ile aynı (`@/lib/payment/status`);
 * `color` aynı varyanttan türetilir (satır ikonu için), ayrı renk tablosu yok.
 */
export const buildStatusConfig = (t: TFunction): Record<string, PaymentHistoryStatus> =>
  Object.fromEntries(
    Object.entries(buildPaymentStatusConfig(t)).map(([status, cfg]) => [
      status,
      { ...cfg, color: statusVariantSolid(cfg.variant), icon: STATUS_ICON[status] ?? 'clock' },
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
