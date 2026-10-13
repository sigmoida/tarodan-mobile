import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { ordersApi, refundsApi, paymentsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import type { OrderCancellationReason } from '@/lib/shared/orderCancellation';
import type { OrderDetail } from '../_lib/types';
import { joinMsg, strMsg } from '../_lib/errors';
import { useInvalidateOrder } from './useInvalidateOrder';

type SnackVariant = 'success' | 'danger' | 'default';

/**
 * Sipariş detay controller'ı: iade-iptal/sipariş-iptal/ödeme-başlat mutation'ları
 * + modalların aç/kapa durumu + snackbar. İade talebinin formu ve mutasyonu
 * `RefundRequestModal`'da (CLAUDE.md §6).
 */
export function useOrderActions(id: string, order: OrderDetail | undefined) {
  const { t } = useTranslation();

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; variant: SnackVariant }>({
    visible: false,
    message: '',
    variant: 'default',
  });
  const notify = (message: string, variant: SnackVariant = 'default') =>
    setSnackbar({ visible: true, message, variant });
  const dismissSnackbar = () => setSnackbar({ visible: false, message: '', variant: 'default' });

  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const invalidateOrder = useInvalidateOrder(id);
  const requireIdentity = useRequireLegalIdentity();

  const cancelRefundMutation = useMutation({
    mutationFn: (refundId: string) => refundsApi.cancel(refundId),
    onSuccess: () => {
      invalidateOrder();
      notify(t('refund.cancel.successMessage'), 'success');
    },
    onError: (err: any) => {
      captureException(err, { level: 'error', tags: { flow: 'refund.cancel' }, extra: { orderId: id } });
      notify(strMsg(err, t('refund.cancel.errorMessage')), 'danger');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (input: { reasonCode: OrderCancellationReason; reason?: string }) =>
      ordersApi.cancel(id, input),
    onSuccess: () => {
      invalidateOrder();
      notify(t('order.orderCancelled'), 'success');
    },
    onError: (err: any) => {
      captureException(err, { level: 'error', tags: { flow: 'order.cancel' }, extra: { orderId: id } });
      notify(strMsg(err, t('order.orderCancelFailed')), 'danger');
    },
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const res: any = await paymentsApi.initiate(id);
      return res.data?.data ?? res.data ?? {};
    },
    onSuccess: (data: any) => {
      const paymentId = data?.paymentId || data?.id || data?.payment?.id || id;
      if (data?.useBypass === true) {
        paymentsApi.bypassComplete(paymentId).catch((e: any) =>
          captureException(e, { level: 'error', tags: { flow: 'order.payBypass' }, extra: { paymentId, orderId: id } }),
        );
        router.replace({ pathname: '/payment/success', params: { paymentId, orderId: id } } as any);
        return;
      }
      router.push({
        pathname: '/payment/[id]',
        params: { id: paymentId, orderId: id, provider: 'paytr', guest: '0' },
      } as any);
    },
    onError: (err: any) => {
      captureException(err, { level: 'error', tags: { flow: 'order.payInitiate' }, extra: { orderId: id } });
      notify(joinMsg(err, t('checkout.paymentInitFailedRetry')), 'danger');
    },
  });

  // --- Handler'lar ---
  const handleCancelRefund = () => {
    const rr = order?.activeRefundRequest;
    if (!rr) return;
    appAlert(t('refund.cancel.confirmTitle'), t('refund.cancel.confirmBody'), [
      { text: t('order.keepOrder'), style: 'cancel' },
      { text: t('order.cancelShort'), style: 'destructive', onPress: () => cancelRefundMutation.mutate(rr.id) },
    ]);
  };

  /**
   * İptal artık bir onay kutusu DEĞİL, nedenli bir form.
   *
   * Sunucu `paid`/`preparing` siparişlerde `reasonCode` olmadan 400 atıyor
   * (`server.order.cancelReasonRequired`) — eski `appAlert` akışı yalnız boş bir
   * gövde gönderdiği için ödenmiş siparişin iptali mobilde HİÇ çalışmıyordu.
   * Form `CancelOrderModal`'da; burada yalnız aç/kapa durumu duruyor.
   */
  const handleCancelOrder = () => setCancelModalVisible(true);

  return {
    snackbar,
    notify,
    dismissSnackbar,
    invalidateOrder,
    // iade modalı
    // iade modalı — form + mutasyon `RefundRequestModal`'da, burada yalnız aç/kapa durumu.
    refundModal: {
      visible: refundModalVisible,
      open: () => setRefundModalVisible(true),
      close: () => setRefundModalVisible(false),
    },
    handleCancelRefund,
    cancelRefundPending: cancelRefundMutation.isPending,
    handleCancelOrder,
    cancelOrderPending: cancelOrderMutation.isPending,
    // iptal modalı — form `CancelOrderModal`'da, burada yalnız aç/kapa durumu.
    cancelModal: {
      visible: cancelModalVisible,
      close: () => setCancelModalVisible(false),
      /** Ödemesi alınmışsa iade uyarısı gösterilir. */
      willRefund: order?.status !== 'pending' && order?.status !== 'pending_payment',
      confirm: (input: { reasonCode: OrderCancellationReason; reason?: string }) =>
        cancelOrderMutation.mutate(input),
    },
    // B-2.4: ödeme başlamadan yasal kimlik (teklif siparişi de buradan ödenir).
    // Vazgeçerse ödeme başlamaz.
    initiatePayment: async () => {
      if (!(await requireIdentity())) return;
      initiatePaymentMutation.mutate();
    },
    payPending: initiatePaymentMutation.isPending,
  };
}
