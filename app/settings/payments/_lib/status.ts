import { theme } from '@/ui';
import type { TFunction } from 'i18next';

const { colors } = theme;

export const buildStatusOptions = (t: TFunction): Array<{ value: string; label: string }> => [
  { value: '', label: t('common.all') },
  { value: 'pending', label: t('payment.statusPending') },
  { value: 'completed', label: t('common.success') },
  { value: 'failed', label: t('payment.statusFailed') },
  { value: 'cancelled', label: t('common.cancel') },
];

export const buildStatusColors = (t: TFunction): Record<string, { bg: string; fg: string; label: string; icon: any }> => ({
  completed: { bg: colors.success[50]!, fg: colors.success[600]!, label: t('common.completed'), icon: 'checkmark-circle' },
  pending: { bg: colors.warning[50]!, fg: colors.warning[600]!, label: t('payment.statusPending'), icon: 'time-outline' },
  failed: { bg: colors.danger[50]!, fg: colors.danger[600]!, label: t('payment.statusFailed'), icon: 'close-circle' },
  cancelled: { bg: colors.gray[100], fg: colors.text.muted, label: t('common.cancel'), icon: 'ban-outline' },
});

// Not: tarih formatı bilerek 'tr-TR' — @/utils/format.formatPrice ile aynı
// yerleşik kararı izliyor (uygulama genelinde para/tarih formatı sabit TL/tr-TR).
export const formatDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
