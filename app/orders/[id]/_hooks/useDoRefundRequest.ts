import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { mediaApi, refundsApi } from '@/lib/api';
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
    mutationFn: async ({ values, orderQuantity }: { values: RefundFormValues; orderQuantity: number }) => {
      let urls: string[] = [];
      if (values.evidence.length > 0) {
        const results = await Promise.all(values.evidence.map((file) => mediaApi.uploadRefundEvidence(file)));
        urls = results.map((r) => r.data?.url).filter(Boolean) as string[];
      }
      return refundsApi.create(orderId, buildRefundBody(values, orderQuantity, urls));
    },
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
