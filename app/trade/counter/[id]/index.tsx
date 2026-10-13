import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useTradeCounter } from './_hooks/useTradeCounter';
import { TradeCounterBody } from './_components/TradeCounterBody';

/**
 * Karşı teklif — İNCE ekran. `useTradeCounter` takas sorgusunu, seçim durumunu ve karşı teklif
 * mutasyonunu taşır; yükleme/hata PageShell'de, gövde `TradeCounterBody`'de. Sonuç toast.
 */
export default function TradeCounterScreen() {
  const { t } = useTranslation();
  const f = useTradeCounter();

  const failed = !!f.tradeQuery.error || (!f.trade && !f.tradeQuery.isLoading);
  const loading = !failed && (f.tradeQuery.isLoading || !f.trade || f.initializedId !== f.trade.id);

  return (
    <PageShell
      title={t('trade.counterOffer')}
      onBack={f.handleBack}
      loading={loading}
      error={failed}
      onRetry={() => f.tradeQuery.refetch()}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <TradeCounterBody f={f} />
    </PageShell>
  );
}
