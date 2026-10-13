import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useOfferDetail } from './_hooks/useOfferDetail';
import { OfferDetailCards } from './_components/OfferDetailCards';
import { OfferDetailActions } from './_components/OfferDetailActions';
import { CounterDialog } from './_modals/CounterDialog';

/** Teklif detayı — PageShell (yükleme/hata kabukta) + SectionCard gövdesi; karşı teklif diyaloğu overlay'de. */
export default function OfferDetailScreen() {
  const { t } = useTranslation();
  const f = useOfferDetail();

  return (
    <PageShell
      title={t('offer.detailTitle')}
      loading={f.isLoading}
      error={!f.isLoading && (f.error || !f.offer)}
      onRetry={() => f.refetch()}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={<CounterDialog f={f} />}
    >
      <OfferDetailCards f={f} />
      <OfferDetailActions f={f} />
    </PageShell>
  );
}
