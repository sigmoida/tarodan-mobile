import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { orderStatusConfig, type StatusConfig, type StatusConfigDef } from '@/lib/shared/status-configs';
import type { Sale, FilterType } from './types';

// Satıcı sipariş durumları: renk + etiket web `orderStatusConfig` ile AYNI
// (`@/lib/shared/status-configs`). Web'de satıcıya özel sipariş etiketi yok;
// mobilde tek bilinçli sapma `paid`: satıcı ekranı aksiyon-odaklı
// ("Ödendi - Hazırla"), varyantı web'inkiyle aynı. preparing→processing
// normalize edildiğinden ikisi de var. Etiketler katalog anahtarıdır — modül
// saf olduğu için çeviri `useSalesStatusConfig` ile render anında yapılır.
export const salesStatusMeta: Record<string, StatusConfigDef> = {
  ...orderStatusConfig,
  paid: { labelKey: 'sale.statusPaidPrepare', variant: orderStatusConfig.paid!.variant },
  processing: orderStatusConfig.preparing!,
};

/** `StatusBadge`'in beklediği, çevrilmiş config. */
export function useSalesStatusConfig(): Record<string, StatusConfig> {
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
