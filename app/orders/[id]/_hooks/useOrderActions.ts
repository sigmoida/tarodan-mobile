import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { ordersApi, refundsApi, mediaApi, paymentsApi, type RNFile } from '@/lib/api';
import { qk } from '@/lib/query';
import { captureException } from '@/services/sentry';
import { MAX_EVIDENCE_PHOTOS } from '../_lib/status';
import type { OrderDetail } from '../_lib/types';

type SnackVariant = 'success' | 'danger' | 'default';

// Ödeme akışının (initiate) hata formu: array ise join'le, sonra string değilse fallback.
const joinMsg = (err: any, fallback: string): string => {
  const raw = err?.response?.data?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw || fallback;
  return typeof msg === 'string' ? msg : fallback;
};

// refund/cancelRefund/cancelOrder'ın ORİJİNAL hata formu: string mesajı göster,
// array/eksik mesajda genel fallback göster (parite — array'i join'leME).
const strMsg = (err: any, fallback: string): string => {
  const msg = err?.response?.data?.message || fallback;
  return typeof msg === 'string' ? msg : fallback;
};

/**
 * Sipariş detay controller'ı: iade/iade-iptal/sipariş-iptal/ödeme-başlat mutation'ları
 * + iade modalının form durumu (sebep/açıklama/adet/kanıt foto) + snackbar.
 */
export function useOrderActions(id: string, order: OrderDetail | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; variant: SnackVariant }>({
    visible: false,
    message: '',
    variant: 'default',
  });
  const notify = (message: string, variant: SnackVariant = 'default') =>
    setSnackbar({ visible: true, message, variant });
  const dismissSnackbar = () => setSnackbar({ visible: false, message: '', variant: 'default' });

  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundReason, setRefundReason] = useState('changed_mind');
  const [refundDescription, setRefundDescription] = useState('');
  const [evidenceAssets, setEvidenceAssets] = useState<RNFile[]>([]);
  const [refundQuantity, setRefundQuantity] = useState(1);

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: qk.orders.detail(id) });
    queryClient.invalidateQueries({ queryKey: qk.orders.all });
  };

  const closeRefundModal = () => {
    setRefundModalVisible(false);
    setEvidenceAssets([]);
    setRefundQuantity(1);
  };

  const refundMutation = useMutation({
    mutationFn: async () => {
      const body: { reason: string; description?: string; evidencePhotoUrls?: string[]; refundQuantity?: number } = {
        reason: refundReason,
      };
      const desc = refundDescription.trim();
      if (desc.length > 0) body.description = desc;
      const orderQty = order?.quantity ?? 1;
      if (orderQty > 1 && refundQuantity < orderQty) body.refundQuantity = refundQuantity;
      if (evidenceAssets.length > 0) {
        const results = await Promise.all(evidenceAssets.map((file) => mediaApi.uploadRefundEvidence(file)));
        const urls = results.map((r) => r.data?.url).filter(Boolean) as string[];
        if (urls.length > 0) body.evidencePhotoUrls = urls;
      }
      return refundsApi.create(id, body);
    },
    onSuccess: () => {
      setRefundModalVisible(false);
      setRefundDescription('');
      setEvidenceAssets([]);
      setRefundQuantity(1);
      notify(t('order.refundRequestCreated'), 'success');
      invalidateOrder();
    },
    onError: (err: any) => {
      captureException(err, { level: 'error', tags: { flow: 'refund.create' }, extra: { orderId: id, reason: refundReason } });
      notify(strMsg(err, t('order.refundRequestFailed')), 'danger');
    },
  });

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
    mutationFn: () => ordersApi.cancel(id),
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

  // --- Kanıt fotoğrafı ---
  const pickEvidence = async () => {
    const remaining = MAX_EVIDENCE_PHOTOS - evidenceAssets.length;
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert(t('order.permissionRequired'), t('order.galleryPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked: RNFile[] = result.assets.slice(0, remaining).map((a, i) => ({
      uri: Platform.OS === 'android' ? a.uri : a.uri.replace('file://', ''),
      name: a.fileName || `evidence_${i}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }));
    setEvidenceAssets((prev) => [...prev, ...picked]);
  };
  const removeEvidence = (index: number) => setEvidenceAssets((prev) => prev.filter((_, i) => i !== index));

  // --- Handler'lar ---
  const handleCancelRefund = () => {
    const rr = order?.activeRefundRequest;
    if (!rr) return;
    appAlert(t('refund.cancel.confirmTitle'), t('refund.cancel.confirmBody'), [
      { text: t('order.keepOrder'), style: 'cancel' },
      { text: t('order.cancelShort'), style: 'destructive', onPress: () => cancelRefundMutation.mutate(rr.id) },
    ]);
  };

  const handleCancelOrder = () => {
    const isUnpaid = order?.status === 'pending';
    appAlert(
      t('order.cancelOrder'),
      isUnpaid
        ? t('order.cancelConfirmBody')
        : t('order.cancelConfirmRefundBody'),
      [
        { text: t('order.keepOrder'), style: 'cancel' },
        { text: t('order.cancelShort'), style: 'destructive', onPress: () => cancelOrderMutation.mutate() },
      ],
    );
  };

  return {
    snackbar,
    notify,
    dismissSnackbar,
    invalidateOrder,
    // iade modalı
    refund: {
      visible: refundModalVisible,
      open: () => setRefundModalVisible(true),
      close: closeRefundModal,
      reason: refundReason,
      setReason: setRefundReason,
      description: refundDescription,
      setDescription: setRefundDescription,
      quantity: refundQuantity,
      setQuantity: setRefundQuantity,
      evidence: evidenceAssets,
      pickEvidence,
      removeEvidence,
      submit: () => refundMutation.mutate(),
      isPending: refundMutation.isPending,
    },
    handleCancelRefund,
    cancelRefundPending: cancelRefundMutation.isPending,
    handleCancelOrder,
    cancelOrderPending: cancelOrderMutation.isPending,
    initiatePayment: () => initiatePaymentMutation.mutate(),
    payPending: initiatePaymentMutation.isPending,
  };
}
