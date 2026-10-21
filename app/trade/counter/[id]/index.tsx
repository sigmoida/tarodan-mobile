import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useTradeCounter } from './_hooks/useTradeCounter';
import { TradeCounterBody, TradeCounterFooter } from './_components/TradeCounterBody';

/**
 * Counter offer, a THIN screen. `useTradeCounter` holds the trade query, the selections and the
 * counter mutation; loading and errors are in PageShell, the body in `TradeCounterBody`. The
 * result is a toast.
 */
export default function TradeCounterScreen() {
  const { t } = useTranslation();
  const f = useTradeCounter();

  // Only a trade that never loaded fails the screen: a failed background refetch keeps the
  // editor and the user's picks on screen.
  const tradeFailed = !f.trade && !f.tradeQuery.isLoading;
  const failed = tradeFailed || f.pickersFailed;
  const loading = !failed && (f.tradeQuery.isLoading || !f.trade || f.initializedId !== f.trade.id);

  return (
    <PageShell
      title={t('trade.counterOffer')}
      onBack={f.handleBack}
      loading={loading}
      error={failed}
      errorMessage={!tradeFailed && f.pickersFailed ? t('collection.productsLoadFailed') : undefined}
      onRetry={() => (tradeFailed ? f.tradeQuery.refetch() : f.retryPickers())}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      footer={f.trade ? <TradeCounterFooter f={f} /> : undefined}
    >
      <TradeCounterBody f={f} />
    </PageShell>
  );
}
