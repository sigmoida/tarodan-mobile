import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { refundsApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { captureException } from '@/services/sentry';
import { buildRefundBody, type RefundFormValues } from '../_lib/schema';
import { strMsg } from '../_lib/errors';
import { orderInvalidationKeys } from './useInvalidateOrder';

export interface RefundRequestVars {
  values: RefundFormValues;
  orderQuantity: number;
  /** Kanıt URL'leri — ekran açıkken `useUploadRefundEvidence` ile alınmış olarak gelir. */
  evidencePhotoUrls: string[];
}

/**
 * İade talebi oluşturma (iade EKRANI sahiplenir). Başarıda sipariş setini
 * tazeler, `onCreated` (ekrandan geri çık) SONRA `toast.success` — toast kök
 * katmanda, navigasyonu aşar. Hata `toast.error`, ekran açık kalır, kullanıcı
 * yeniden dener. Hata metni orders paritesi: yalnız string sunucu mesajı
 * (`strMsg`), dizi mesajda yedek metin.
 */
export function useDoRefundRequest(orderId: string, { onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  return useAppMutation(
    ({ values, orderQuantity, evidencePhotoUrls }: RefundRequestVars) =>
      refundsApi.create(orderId, buildRefundBody(values, orderQuantity, evidencePhotoUrls)),
    {
      invalidates: orderInvalidationKeys(orderId),
      silentError: true,
      onSuccess: () => {
        onCreated();
        toast.success(t('order.refundRequestCreated'));
      },
      onError: (err, { values }) => {
        captureException(err, {
          level: 'error',
          tags: { flow: 'refund.create' },
          extra: { orderId, reason: values.reason },
        });
        toast.error(strMsg(err, t('order.refundRequestFailed')));
      },
    },
  );
}
