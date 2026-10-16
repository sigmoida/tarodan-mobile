import { useQuery } from '@tanstack/react-query';
import { shippingApi, type Shipment } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';

/**
 * Siparişin kargo kaydı. Hem alıcı sipariş detayı hem satıcı kargo ekranı
 * kullanıyor, o yüzden rota-yerel değil paylaşılan hook.
 *
 * **404 hata DEĞİL:** her siparişin kargo kaydı yok. Uç
 * `404 "Bu sipariş için kargo bulunamadı"` döndürüyor; bunu `null`'a çeviriyoruz
 * ki satıcıya olmayan bir sorun gösterilmesin ve onarım yolu açık kalsın.
 *
 * **Diğer hatalar (ör. 500) normal hata yolunda kalır** — `queryFn` onları
 * yeniden fırlatır ve `isError`/`error` çağırana geçer. `shipment` her iki
 * durumda da (kayıt yok / gerçek hata) `null` olduğu için tüketen ekran bu
 * ikisini `isError`'a bakmadan ayırt edemez.
 */
export function useOrderShipment(orderId: string | undefined) {
  const query = useQuery({
    queryKey: qk.shipping.byOrder(orderId ?? ''),
    queryFn: async () => {
      try {
        const res = await shippingApi.getOrderShipments(orderId!);
        const body = unwrapEnvelope<Partial<Shipment>>(res);
        // `unwrapEnvelope` veri yoksa `{}` döner (bkz. apiEnvelope.ts), `null`
        // değil — boş gövdeyi kayıt sanmamak için `id` yokluğuna bakıyoruz.
        return body?.id ? (body as Shipment) : null;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(orderId),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
  // Ekrana geri dönüldüğünde, veri `staleTime`'dan (30 sn) eskiyse tazele. `isCodePending`
  // NORMAL bir ara durum ve kod birkaç dakika içinde geliyor — zamanlayıcıyla poll etmek pil
  // yakar ve hiçbir şeyi hızlandırmaz. İlk açılışta sorgunun kendi yüklemesine ikinci istek yok.
  useRefetchStaleOnFocus([qk.shipping.byOrder(orderId ?? '')], Boolean(orderId));

  return {
    shipment: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
