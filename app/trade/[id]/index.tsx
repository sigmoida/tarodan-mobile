import { router, useLocalSearchParams } from "expo-router";
import { PageShell } from "@/components/common/PageShell";
import { useRefresh } from "@/hooks/useRefresh";
import { useAuthStore } from "@/stores/authStore";
import { tradeViewerRole } from "@/lib/shared/tradeStatus";
import { useTranslation } from "react-i18next";
import { toast } from "@/ui";
import { copyToClipboard } from "@/lib/clipboard";
import { deriveTradeView } from "./_lib/derive";
import { useTrade } from "./_hooks/useTrade";
import { useCountdown } from "./_hooks/useCountdown";
import { useTradeActions } from "./_hooks/useTradeActions";
import { useTradePaymentQuote } from "./_hooks/useTradePaymentQuote";
import { TradeStatusHeader } from "./_components/TradeStatusHeader";
import { TradeInfoCard } from "./_components/TradeInfoCard";
import { TradeItemsCompare } from "./_components/TradeItemsCompare";
import { TradeCashCard } from "./_components/TradeCashCard";
import { TradePaymentsCard } from "./_components/TradePaymentsCard";
import { TradeCostPreviewCard } from "./_components/TradeCostPreviewCard";
import { TradeMessages } from "./_components/TradeMessages";
import { TradeShippingSection } from "./_components/TradeShippingSection";
import { TradeProtectionCard } from "./_components/TradeProtectionCard";
import { TradeActions } from "./_components/TradeActions";
import { RejectTradeModal } from "./_modals/RejectTradeModal";

/**
 * Takas detayı — İNCE ekran: PageShell + durum başlığı + SectionCard dizisi + eylemler. Türetilmiş
 * değerler `deriveTradeView`'da, mutasyonlar `useTradeActions`'ta; bildirimler toast, reddet modalı
 * `overlay`'de (yükleme/hata durumunda unmount olmaz). İtiraz ayrı form ekranı (`./dispute`).
 */
export default function TradeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const tradeId = String(id);

  const {
    data: trade,
    isLoading,
    refetch,
  } = useTrade(id as string | undefined);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const now = useCountdown();
  const actions = useTradeActions(tradeId);
  const { quote: paymentQuote } = useTradePaymentQuote(tradeId);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)" as never);
  };

  if (isLoading) {
    return <PageShell title={t('trade.detailTitle')} onBack={handleBack} loading />;
  }

  if (!trade) {
    return (
      <PageShell
        title={t('trade.detailTitle')}
        onBack={handleBack}
        empty
        emptyState={{
          icon: "arrows-right-left",
          title: t('trade.notFoundTitle'),
          subtitle: t('emptyState.notFoundHint'),
          actionLabel: t('common.goBack'),
          onAction: handleBack,
        }}
      />
    );
  }

  const view = deriveTradeView(trade, user, paymentQuote);
  const copyCode = (code?: string | null) => {
    if (!copyToClipboard(code)) return;
    toast.success(t('trade.trackingCopied'));
  };

  return (
    <PageShell
      title={t('trade.tradeNumberTitle', { number: trade.tradeNumber })}
      onBack={handleBack}
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <RejectTradeModal
          visible={actions.reject.visible}
          onClose={actions.reject.close}
          reason={actions.reject.reason}
          setReason={actions.reject.setReason}
          onSubmit={actions.reject.submit}
        />
      }
    >
      <TradeStatusHeader
        trade={trade}
        t={t}
        now={now}
        hasPaymentStep={view.hasPaymentStep}
        viewerRole={tradeViewerRole(trade, user?.id)}
      />
      <TradeInfoCard
        trade={trade}
        isInitiator={view.isInitiator}
        otherParty={view.otherParty}
      />
      <TradeItemsCompare
        myItems={view.myItems}
        theirItems={view.theirItems}
        myTotal={view.myTotal}
        theirTotal={view.theirTotal}
        otherPartyName={view.otherParty.displayName}
      />
      <TradeCashCard
        trade={trade}
        userId={user?.id}
        otherPartyName={view.otherParty.displayName}
        cashPaid={view.cashPaid}
        cashCommission={view.cashCommission}
        cashTotal={view.cashTotal}
        isV2={view.isV2}
      />
      <TradePaymentsCard view={view} otherPartyName={view.otherParty.displayName} />
      <TradeCostPreviewCard
        mine={view.isInitiator ? paymentQuote?.initiator ?? null : paymentQuote?.receiver ?? null}
        theirs={view.isInitiator ? paymentQuote?.receiver ?? null : paymentQuote?.initiator ?? null}
        lockedPaymentCount={view.totalCount}
      />
      <TradeMessages trade={trade} />
      <TradeShippingSection
        trade={trade}
        view={view}
        t={t}
        onCopy={copyCode}
      />
      <TradeProtectionCard status={trade.status} />
      <TradeActions
        trade={trade}
        id={tradeId}
        t={t}
        isInitiator={view.isInitiator}
        isReceiver={view.isReceiver}
        userId={user?.id}
        otherPartyId={view.otherParty.id}
        cashPaid={view.cashPaid}
        cashTotal={view.cashTotal}
        cashCommission={view.cashCommission}
        isV2={view.isV2}
        myPaymentRow={view.myPaymentRow}
        myPaymentPending={view.myPaymentPending}
        paidCount={view.paidCount}
        totalCount={view.totalCount}
        myFromWarehouseStatus={view.myFromWarehouseShipment?.status}
        hasShippedLeg={view.hasShippedLeg}
        actions={{
          setTradeAddressId: actions.setTradeAddressId,
          handleAccept: actions.handleAccept,
          acceptPending: actions.acceptPending,
          openReject: actions.reject.open,
          rejectPending: actions.rejectPending,
          handleCancel: actions.handleCancel,
          cancelPending: actions.cancelPending,
          cashPay: actions.cashPay,
          cashPayPending: actions.cashPayPending,
          confirm: actions.confirm,
          confirmPending: actions.confirmPending,
          openDispute: actions.openDispute,
        }}
      />
    </PageShell>
  );
}
