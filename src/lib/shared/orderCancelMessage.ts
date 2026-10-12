/**
 * İptal edilmiş siparişin "neden iptal edildi" cümlesi — alıcı (`app/orders/[id]`)
 * ve satıcı (`app/sales/[id]`) sipariş detayının TEK kaynağı.
 *
 * Sunucu ham `cancelReason`'ı stabil bir `cancelCategory`'ye eşliyor
 * (`order-common.service.ts` → `deriveCancelCategory`); cümle kategoriden
 * kurulur. Web'in `getCancelMessage`'ıyla aynı eşleme
 * (`profile/(commerce)/orders/[id]/_lib/types.ts`).
 *
 * `other` / bilinmeyen kategori: sunucunun yazdığı metin ham basılır. Yönetici
 * (platform) iptali buraya düşer — sunucu "Yönetici tarafından iptal edildi:
 * <etiket>" yazıyor. Web'den TEK sapma: alıcı iptali açıklamasız yapıldıysa
 * sunucu metin yerine iptal KODUNU (`changed_mind`) yazıyor; web onu ham
 * basıyor, burada katalog etiketine çevrilir.
 */
import type { TFunction } from 'i18next';
import { reasonLabelKey } from './orderCancellation';

/** Sunucunun `cancelCategory` değerleri (yalnız `status === 'cancelled'` iken dolu). */
export type OrderCancelCategory =
  | 'buyer_cancelled'
  | 'payment_timeout'
  | 'seller_no_ship'
  | 'stockout'
  | 'trade_reserved'
  | 'bulk_replaced'
  | 'admin_buyer_favor'
  | 'admin'
  | 'other';

/**
 * Cümleyi kimin okuduğu — `buyer_cancelled` buna göre değişir. Ekran AÇIKÇA
 * geçer (alıcı detayı `user.id`'den, satış detayı her zaman `seller`):
 * yanıttaki `isBuyer`'a güvenmek, alan gelmediğinde alıcıya satıcı cümlesini
 * ("Alıcı bu siparişi iptal etti") gösteriyordu.
 */
export type OrderCancelAudience = 'buyer' | 'seller';

export function orderCancelMessage(
  order: {
    cancelCategory?: string | null;
    cancelReason?: string | null;
  },
  audience: OrderCancelAudience,
  t: TFunction,
): string | null {
  switch (order.cancelCategory) {
    case 'buyer_cancelled':
      return audience === 'buyer' ? t('order.cancelMsgYouCancelled') : t('order.cancelMsgBuyerCancelled');
    case 'payment_timeout':
      return t('order.cancelMsgPaymentTimeout');
    case 'seller_no_ship':
      return t('order.cancelMsgSellerNoShip');
    case 'stockout':
      return t('order.cancelMsgStockout');
    case 'trade_reserved':
      return t('order.cancelMsgTradeReserved');
    case 'bulk_replaced':
      return t('order.cancelMsgBulkReplaced');
    case 'admin_buyer_favor':
      return t('order.cancelMsgAdminBuyerFavor');
    case 'admin':
      return t('order.cancelMsgAdmin');
    default: {
      const raw = order.cancelReason?.trim();
      if (!raw) return null;
      const key = reasonLabelKey(raw);
      return key ? t(key) : raw;
    }
  }
}
