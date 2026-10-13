/**
 * Misafir sipariş iptali — `POST /orders/guest/cancel` (delta 19).
 *
 * Kimlik doğrulaması takip ucuyla AYNI: sipariş numarası + siparişte kayıtlı
 * e-posta. Misafir siparişi sentetik bir alıcıya bağlı olduğu için oturum
 * tabanlı iptal ucu bu kullanıcıda hiç çalışmıyordu — süreç dokümanının
 * "alıcı, kargoya verilene kadar iptal edebilir" taahhüdü misafirde karşılıksız
 * kalıyordu.
 *
 * Bu ekranın verisi React Query'de DEĞİL (takip formu kendi `useState`'inde
 * tutuyor, çünkü sorgu anahtarı kullanıcının yazdığı iki alandan doğuyor ve
 * önbelleğe alınması istenmiyor). Bu yüzden `invalidateQueries` yerine
 * `onSettled` ile takip isteği yeniden koşuluyor: kullanıcı iptalin sonucunu
 * aynı kartta görüyor.
 */
import { useTranslation } from 'react-i18next';
import { ordersApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { captureException } from '@/services/sentry';
import type { OrderCancellationReason } from '@/lib/shared/orderCancellation';

export type GuestCancelInput = {
  reasonCode: OrderCancellationReason;
  reason?: string;
};

export function useGuestOrderCancel({
  orderNumber,
  email,
  onDone,
}: {
  orderNumber: string;
  email: string;
  /** İptalden sonra siparişi yeniden sorgula (başarı ve hata — durum her iki halde de tazelenmeli). */
  onDone: () => void;
}) {
  const { t } = useTranslation();

  // Bilgi/başarı = toast, hata = toast.error (web react-hot-toast). Açık Modal'ın altında kalır:
  // iptal modalı onay anında kapanır (CancelOrderModal), mutasyon sonucu sonra bildirilir.
  return useAppMutation(
    (input: GuestCancelInput) =>
      ordersApi.cancelGuest({
        orderNumber: orderNumber.trim(),
        email: email.trim().toLowerCase(),
        ...input,
      }),
    {
      success: t('order.guestCancelDone'),
      error: t('order.guestCancelFailed'),
      onError: (err: any) => {
        captureException(err, {
          level: 'error',
          tags: { flow: 'order.guestCancel' },
          // PII yok: sipariş numarası ve e-posta GÖNDERİLMEZ, yalnız durum kodu.
          extra: { status: err?.response?.status },
        });
      },
      mutation: { onSettled: onDone },
    },
  );
}
