import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useSaleDetail } from './_hooks/useSaleDetail';
import { SaleDetailBody } from './_components/SaleDetailBody';

/** Satış detayı — PageShell (yükleme/hata/yenileme kabukta) + SectionCard gövdesi. */
export default function SaleDetailScreen() {
  const { t } = useTranslation();
  const f = useSaleDetail();

  return (
    <PageShell
      title={
        !f.order
          ? t('order.orderDetails')
          : f.order.orderNumber
            ? t('sale.orderNumberTitle', { number: f.order.orderNumber })
            : t('order.order')
      }
      loading={f.isLoading}
      error={!f.isLoading && (f.error || !f.order)}
      onRetry={() => f.refetch()}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <SaleDetailBody f={f} />
    </PageShell>
  );
}
