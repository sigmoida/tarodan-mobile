import { useTranslation } from 'react-i18next';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Spinner, Snackbar, ScreenHeader, EmptyState, theme } from '@/ui';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedRefreshControl } from '@/components/common';
import { useRefresh } from '@/hooks/useRefresh';
import RatingModal from '@/components/RatingModal';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useOrderShipment } from '@/hooks/useOrderShipment';
import { deriveOrderView } from './_lib/derive';
import { useOrder } from './_hooks/useOrder';
import { useOrderInvoices } from './_hooks/useOrderInvoices';
import { useOrderActions } from './_hooks/useOrderActions';
import { OrderStatusCard } from './_components/OrderStatusCard';
import { OrderEscrowCard, OrderCancelledInfo, OrderPayPendingCard, OrderTrackingCard } from './_components/OrderInfoCards';
import { OrderProductCard, OrderSellerCard } from './_components/OrderProductSeller';
import { OrderAddressCard, OrderPriceSummary } from './_components/OrderAddressPrice';
import { OrderElogoInvoiceCard, OrderSellerInvoiceCard } from './_components/OrderInvoiceCards';
import {
  OrderCancelCard,
  OrderRatingButtons,
  OrderRefundBanner,
  OrderRefundActionCard,
  OrderHelpCard,
} from './_components/OrderActionCards';
import { RefundRequestModal } from './_modals/RefundRequestModal';

const { colors } = theme;

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading, refetch } = useOrder(id);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [ratingModal, setRatingModal] = useState<{ visible: boolean; type: 'product' | 'seller' }>({
    visible: false,
    type: 'product',
  });
  const actions = useOrderActions(String(id), order ?? undefined);
  const invoices = useOrderInvoices(String(id), order?.status, actions.notify);
  const { shipment } = useOrderShipment(id);
  const { user } = useAuthStore();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="lg" />
      </View>
    );
  }
  if (!order) {
    return (
      <EmptyState fullscreen icon="receipt-outline" title="Sipariş bulunamadı" actionLabel="Geri Dön" onAction={back} />
    );
  }

  const view = deriveOrderView(order);
  const isSeller = !!user?.id && order?.seller?.id === user.id;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Sipariş Detayı" onBack={back} />

      <ScrollView
        style={styles.content}
        refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <OrderEscrowCard order={order} view={view} />
        <OrderStatusCard order={order} view={view} />
        <OrderCancelledInfo view={view} />
        <OrderPayPendingCard order={order} view={view} onPay={actions.initiatePayment} payPending={actions.payPending} />
        <OrderTrackingCard order={order} view={view} shipment={shipment} isSeller={isSeller} />
        <OrderProductCard order={order} />
        <OrderSellerCard order={order} />
        <OrderAddressCard order={order} isMembershipOrder={view.isMembershipOrder} />
        <OrderPriceSummary order={order} isMembershipOrder={view.isMembershipOrder} />
        <OrderCancelCard order={order} view={view} onCancel={actions.handleCancelOrder} cancelPending={actions.cancelOrderPending} />
        <OrderRatingButtons order={order} view={view} onRate={(type) => setRatingModal({ visible: true, type })} />
        <OrderRefundBanner
          order={order}
          view={view}
          onCancelRefund={actions.handleCancelRefund}
          cancelRefundPending={actions.cancelRefundPending}
        />
        <OrderRefundActionCard order={order} view={view} onOpenRefund={actions.refund.open} />
        {/* B7: fatura verileri ayrı query'lerle sonradan gelir (bkz. useOrderInvoices); dokunulan
            aksiyon kartlarının (iptal/değerlendirme/iade) ALTINDA render edilir ki geç gelen
            içerik hiçbir dokunma hedefini kaydırmasın. */}
        <OrderElogoInvoiceCard elogoInvoice={invoices.elogoInvoice} onView={invoices.viewInvoice} downloading={invoices.downloadingInvoice} />
        <OrderSellerInvoiceCard
          sellerInvoice={invoices.sellerInvoice}
          onView={invoices.viewSellerInvoice}
          downloading={invoices.downloadingSellerInvoice}
          onUpload={invoices.pickAndUploadSellerInvoice}
          uploading={invoices.uploadingSellerInvoice}
        />
        <OrderHelpCard />

        <View style={{ height: 50 }} />
      </ScrollView>

      <RefundRequestModal
        visible={actions.refund.visible}
        onClose={actions.refund.close}
        orderQuantity={order.quantity ?? 1}
        reason={actions.refund.reason}
        setReason={actions.refund.setReason}
        description={actions.refund.description}
        setDescription={actions.refund.setDescription}
        quantity={actions.refund.quantity}
        setQuantity={actions.refund.setQuantity}
        evidence={actions.refund.evidence}
        pickEvidence={actions.refund.pickEvidence}
        removeEvidence={actions.refund.removeEvidence}
        onSubmit={actions.refund.submit}
        isPending={actions.refund.isPending}
      />

      <Snackbar
        visible={actions.snackbar.visible}
        onDismiss={actions.dismissSnackbar}
        duration={3500}
        variant={actions.snackbar.variant}
      >
        {actions.snackbar.message}
      </Snackbar>

      <RatingModal
        visible={ratingModal.visible}
        onDismiss={() => setRatingModal((r) => ({ ...r, visible: false }))}
        type={ratingModal.type}
        orderId={order.id}
        productId={order.product.id}
        sellerId={order.seller.id}
        productTitle={order.product.title}
        sellerName={order.seller.displayName}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: qk.orders.detail(String(id)) });
          actions.notify(t('order.reviewReceived'), 'success');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: theme.spacing[4] },
});
