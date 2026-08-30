import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { BadgeVariant } from '@/ui';
import type { MessageKey } from '@/i18n/lib';
import type { Sale, FilterType } from './types';

// TÜM OrderStatus enum değerlerini kapsar (eksik durum = StatusBadge ham enum
// gösterir, örn. "refunded"). Etiketler alıcı orders/[id] uiOrderStatusMeta
// (`@/lib/shared/orderStatus`) ile TUTARLI OLMAYABİLİR: satıcı ekranı
// aksiyon-odaklı ("Ödendi - Hazırla", "Kargoda") — bu satıcı-tarafı kelime
// seçimleri BİLEREK alıcı etiketlerinden farklı; sözlük burada TEK kaynak,
// alıcı tarafıyla birleştirilmedi. Etiketler sabit metin DEĞİL, katalog
// anahtarıdır — modül saf olduğu için `useTranslation` çağıramaz; çeviri
// `useSalesStatusConfig` ile render anında yapılır. preparing→processing
// normalize edildiğinden ikisi de var.
export const salesStatusMeta: Record<
  string,
  { labelKey: MessageKey; variant: BadgeVariant }
> = {
  pending_payment: { labelKey: 'sale.statusPendingPayment', variant: 'warning' },
  paid: { labelKey: 'sale.statusPaidPrepare', variant: 'success' },
  preparing: { labelKey: 'order.statusProcessing', variant: 'info' },
  processing: { labelKey: 'order.statusProcessing', variant: 'info' },
  shipped: { labelKey: 'sale.statusShipped', variant: 'primary' },
  delivered: { labelKey: 'order.statusDelivered', variant: 'success' },
  awaiting_buyer_confirmation: { labelKey: 'sale.statusAwaitingConfirmation', variant: 'info' },
  completed: { labelKey: 'order.statusCompleted', variant: 'success' },
  cancelled: { labelKey: 'order.statusCancelled', variant: 'danger' },
  refund_requested: { labelKey: 'order.statusRefundInProgress', variant: 'danger' },
  refunded: { labelKey: 'order.statusRefunded', variant: 'secondary' },
};

/** `StatusBadge`'in beklediği, çevrilmiş config. */
export function useSalesStatusConfig(): Record<string, { label: string; variant: BadgeVariant }> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(salesStatusMeta).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}

// Filtre sekmeleri sırası.
export const SALE_FILTERS: FilterType[] = [
  'all',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

// Rozet/filtre durumu: cancellationType='iptal' → 'cancelled' (status 'refunded'
// olsa bile "İade" deme); aksi halde siparişin kendi durumu. Alıcı orders/index
// badgeStatusOf ile tutarlı.
export const saleBadgeStatus = (sale: Sale): string =>
  sale.cancellationType === 'iptal' ? 'cancelled' : sale.status;

function buildStatusLabel(t: TFunction, salesConfig: Record<string, { label: string }>) {
  return (status: FilterType): string => {
    if (status === 'all') return t('common.all');
    if (status === 'cancelled') return t('sale.filterCancelledOrRefunded');
    return salesConfig[status]?.label ?? status;
  };
}

/** Filtre çipi etiketi — 'all'/'cancelled' özel; diğerleri `salesStatusMeta`'dan. */
export function useStatusLabel(): (status: FilterType) => string {
  const { t } = useTranslation();
  const config = useSalesStatusConfig();
  return useMemo(() => buildStatusLabel(t, config), [t, config]);
}

export const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
