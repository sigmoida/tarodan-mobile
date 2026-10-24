import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { isNotFoundError } from '@/lib/query';
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

  // A 404 (the trade is gone) shows "not found", like the trade detail, even over a cached
  // trade: the counter would be refused. Any other error fails the screen only when no trade
  // ever loaded; a failed background refetch keeps the editor and the user's picks on screen.
  const tradeGone = isNotFoundError(f.tradeQuery.error);
  const tradeFailed = !tradeGone && !f.trade && !f.tradeQuery.isLoading;
  const failed = tradeFailed || (!tradeGone && f.pickersFailed);
  const loading =
    !tradeGone && !failed && (f.tradeQuery.isLoading || !f.trade || f.initializedId !== f.trade.id);

  return (
    <PageShell
      title={t('trade.counterOffer')}
      onBack={f.handleBack}
      loading={loading}
      error={failed}
      errorMessage={!tradeFailed && f.pickersFailed ? t('collection.productsLoadFailed') : undefined}
      onRetry={() => {
        if (tradeFailed) void f.tradeQuery.refetch();
        if (f.pickersFailed) f.retryPickers();
      }}
      empty={tradeGone}
      emptyState={{
        icon: 'arrows-right-left',
        title: t('trade.notFoundTitle'),
        subtitle: t('emptyState.notFoundHint'),
        actionLabel: t('common.goBack'),
        onAction: f.handleBack,
      }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      footer={f.trade && !tradeGone ? <TradeCounterFooter f={f} /> : undefined}
    >
      <TradeCounterBody f={f} />
    </PageShell>
  );
}
