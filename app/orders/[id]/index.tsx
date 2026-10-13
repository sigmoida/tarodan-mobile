import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useRefresh } from '@/hooks/useRefresh';
import { PageShell } from '@/components/common/PageShell';
import { useOrderShipment } from '@/hooks/useOrderShipment';
import { useTimingPolicy } from '@/hooks/useTimingPolicy';
import { useDeadlineNow } from '@/hooks/useDeadlineNow';
import { ElogoInvoiceList } from '@/components/orders/ElogoInvoiceList';
import { PreparingDeadlineNotice } from '@/components/orders/PreparingDeadlineNotice';
import { deriveOrderView } from './_lib/derive';
import { openOrderReview, openRefundRequest } from './_lib/routes';
import { useOrder } from './_hooks/useOrder';
import { useOrderInvoices } from './_hooks/useOrderInvoices';
import { useOrderActions } from './_hooks/useOrderActions';
import { OrderStatusCard } from './_components/OrderStatusCard';
import { OrderEscrowCard, OrderCancelledInfo, OrderPayPendingCard, OrderTrackingCard } from './_components/OrderInfoCards';
import { OrderProductCard, OrderSellerCard } from './_components/OrderProductSeller';
import { OrderAddressCard, OrderPriceSummary } from './_components/OrderAddressPrice';
import { OrderSellerInvoiceCard } from './_components/OrderInvoiceCards';
import {
  OrderCancelCard,
  OrderRatingButtons,
  OrderRefundBanner,
  OrderRefundActionCard,
  OrderHelpCard,
} from './_components/OrderActionCards';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';

/**
 * Sipariş detayı — İNCE ekran: PageShell + SectionCard dizisi. Durum kapılı kartlar kendini gizler
 * (`null`); türetilmiş değerler `deriveOrderView`'da, mutasyonlar `useOrderActions`'ta. Bildirimler
 * toast; modallar `overlay` slotunda (yükleme/hata durumunda unmount olmaz). İade talebi ve
 * değerlendirme ayrı form ekranlarıdır (`./refund`, `./review`).
 */
export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading, refetch } = useOrder(id);
  const actions = useOrderActions(String(id), order ?? undefined);
  const invoices = useOrderInvoices(String(id), order?.status, actions.notify);
  // Pull-to-refresh siparişle birlikte e-Arşiv listesini de yeniler.
  const { refreshing, onRefresh } = useRefresh(refetch, invoices.refreshElogoInvoices);
  const { shipment } = useOrderShipment(id);
  const policy = useTimingPolicy();
  const now = useDeadlineNow(order?.preparingDeadline);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!isLoading && !order) {
    return (
      <PageShell
        title={t('order.orderDetails')}
        onBack={back}
        empty
        emptyState={{
          icon: 'receipt-percent',
          title: t('order.orderNotFound'),
          subtitle: t('emptyState.notFoundHint'),
          actionLabel: t('common.goBack'),
          onAction: back,
        }}
      />
    );
  }
  if (!order) return <PageShell title={t('order.orderDetails')} onBack={back} loading />;

  // Taraf siparişin kendi `isSeller` bayrağından (web; `user.id` karşılaştırması
  // değil). Bayrak yoksa alıcı varsayılır: alıcıya satıcı cümlesi çıkmaz.
  const isSeller = !!order.isSeller;
  const audience = isSeller ? 'seller' : 'buyer';
  const view = deriveOrderView(order, policy, now);

  return (
    <PageShell
      title={t('order.orderDetails')}
      onBack={back}
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <CancelOrderModal
          isOpen={actions.cancelModal.visible}
          onClose={actions.cancelModal.close}
          onConfirm={actions.cancelModal.confirm}
          willRefund={actions.cancelModal.willRefund}
          pending={actions.cancelOrderPending}
        />
      }
    >
      <OrderEscrowCard order={order} view={view} />
      <OrderStatusCard order={order} view={view} />
      <OrderCancelledInfo order={order} view={view} audience={audience} />
      <PreparingDeadlineNotice notice={view.preparingNotice} />
      <OrderPayPendingCard order={order} view={view} onPay={actions.initiatePayment} payPending={actions.payPending} />
      <OrderTrackingCard order={order} view={view} shipment={shipment} isSeller={isSeller} />
      <OrderProductCard order={order} />
      <OrderSellerCard order={order} />
      <OrderAddressCard order={order} isMembershipOrder={view.isMembershipOrder} />
      <OrderPriceSummary order={order} isMembershipOrder={view.isMembershipOrder} />
      <OrderCancelCard order={order} view={view} onCancel={actions.handleCancelOrder} cancelPending={actions.cancelOrderPending} />
      <OrderRatingButtons order={order} view={view} onRate={(type) => openOrderReview(order.id, type)} />
      <OrderRefundBanner
        order={order}
        view={view}
        onCancelRefund={actions.handleCancelRefund}
        cancelRefundPending={actions.cancelRefundPending}
      />
      <OrderRefundActionCard order={order} view={view} onOpenRefund={() => openRefundRequest(order.id)} />
      {/* B7: fatura verileri ayrı query'lerle sonradan gelir (bkz. useOrderInvoices); dokunulan
          aksiyon kartlarının (iptal/değerlendirme/iade) ALTINDA render edilir ki geç gelen
          içerik hiçbir dokunma hedefini kaydırmasın. */}
      <ElogoInvoiceList
        invoices={invoices.elogoInvoices}
        onOpen={invoices.openElogoInvoice}
        openingId={invoices.openingElogoInvoiceId}
        loadFailed={invoices.elogoLoadFailed}
        onRetry={invoices.refreshElogoInvoices}
      />
      <OrderSellerInvoiceCard
        sellerInvoice={invoices.sellerInvoice}
        onView={invoices.viewSellerInvoice}
        downloading={invoices.downloadingSellerInvoice}
        onUpload={invoices.pickAndUploadSellerInvoice}
        uploading={invoices.uploadingSellerInvoice}
      />
      <OrderHelpCard />
    </PageShell>
  );
}
