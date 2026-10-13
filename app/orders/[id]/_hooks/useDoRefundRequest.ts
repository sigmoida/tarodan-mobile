import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { refundsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { buildRefundBody, type RefundFormValues } from '../_lib/schema';
import { strMsg } from '../_lib/errors';
import { useInvalidateOrder } from './useInvalidateOrder';
import type { Notify } from '../_lib/types';

/**
 * İade talebi oluşturma (RefundRequestModal sahiplenir). Geri bildirim ekranın
 * snackbar'ına gider; modal mutasyondan ÖNCE kapandığı için snackbar/uyarı
 * hiçbir zaman açık bir ui-native Modal'ın üstüne çıkmaz (iOS donması).
 */
export function useDoRefundRequest(orderId: string, notify: Notify) {
  const { t } = useTranslation();
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation({
    // Kanıt URL'leri modal açıkken `useUploadRefundEvidence` ile alınmış olarak gelir.
    mutationFn: ({
      values,
      orderQuantity,
      evidencePhotoUrls,
    }: {
      values: RefundFormValues;
      orderQuantity: number;
      evidencePhotoUrls: string[];
    }) => refundsApi.create(orderId, buildRefundBody(values, orderQuantity, evidencePhotoUrls)),
    onSuccess: () => {
      notify(t('order.refundRequestCreated'), 'success');
      invalidateOrder();
    },
    onError: (err: unknown, { values }) => {
      captureException(err, {
        level: 'error',
        tags: { flow: 'refund.create' },
        extra: { orderId, reason: values.reason },
      });
      notify(strMsg(err, t('order.refundRequestFailed')), 'danger');
    },
  });
}
