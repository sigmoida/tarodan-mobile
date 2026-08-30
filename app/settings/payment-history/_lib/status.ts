import { theme } from '@/ui';
import type { TFunction } from 'i18next';

export const buildStatusConfig = (t: TFunction): Record<string, { label: string; color: string; icon: string }> => ({
  completed: { label: t('common.completed'), color: theme.colors.success[500], icon: 'checkmark-circle' },
  paid: { label: t('common.completed'), color: theme.colors.success[500], icon: 'checkmark-circle' },
  failed: { label: t('payment.statusFailed'), color: theme.colors.danger[500], icon: 'close-circle' },
  pending: { label: t('payment.statusPending'), color: theme.colors.warning[500], icon: 'time' },
  // İade edilen ödeme "Bekliyor" değil, açıkça "İade Edildi" gösterilmeli (web ile tutarlı).
  refunded: { label: t('order.statusRefunded'), color: theme.colors.warning[500], icon: 'arrow-undo' },
  refund_requested: { label: t('order.statusRefundInProgress'), color: theme.colors.warning[500], icon: 'time' },
});

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
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
