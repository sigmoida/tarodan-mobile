import type { TFunction } from 'i18next';
import { buildPaymentStatusConfig } from '@/lib/payment/status';

export const buildStatusOptions = (t: TFunction): Array<{ value: string; label: string }> => {
  // Filtre etiketleri web `paymentStatusConfig` ile aynı kelimeler.
  const config = buildPaymentStatusConfig(t);
  return [
    { value: '', label: t('common.all') },
    { value: 'pending', label: config.pending!.label },
    { value: 'completed', label: config.completed!.label },
    { value: 'failed', label: config.failed!.label },
    { value: 'cancelled', label: config.cancelled!.label },
  ];
};

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
