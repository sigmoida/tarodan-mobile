/**
 * İptal edilmiş siparişin "neden iptal edildi" cümlesi — alıcı (`app/orders/[id]`)
 * ve satıcı (`app/sales/[id]`) sipariş detayının TEK kaynağı.
 *
 * Web `getCancelMessage` + `OrderBanners` ile BİREBİR
 * (`profile/(commerce)/orders/[id]/_lib/types.ts`, `_sections/OrderBanners.tsx`).
 * Web'de alıcı ve satıcı AYNI sayfayı görür (`/seller/orders/[id]` →
 * `/profile/orders/[id]` yönlendirmesi), yani kurallar iki ekranda da aynı:
 *
 * - Yalnız `status === 'cancelled'` siparişte cümle var (web banner kapısı;
 *   sunucu `cancelCategory`'yi de yalnız o durumda doldurur). Kargo öncesi
 *   ödenmiş iptal (`cancellationType: 'iptal'`, status `refunded`) için web
 *   neden göstermez → burada da `null`.
 * - Kategori → katalog cümlesi.
 * - `other` / bilinmeyen kategori: sunucunun yazdığı `cancelReason` ham basılır
 *   — alıcının serbest notu da dahil, satıcıya da (web aynı; sunucu bu alanı
 *   "taraflara görünür" diye yazıyor: `refund/helpers/pre-shipment-cancellation.ts`).
 *   Yönetici iptalinde metin sunucuda Türkçe üretilir; EN arayüzde de Türkçe
 *   görünür (web ile aynı, sunucu işi).
 */
import type { TFunction } from 'i18next';

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
    /** API durumu; mobil UI normalizasyonu da `cancelled`'ı aynen bırakır. */
    status?: string | null;
    cancelCategory?: string | null;
    cancelReason?: string | null;
  },
  audience: OrderCancelAudience,
  t: TFunction,
): string | null {
  if (order.status !== 'cancelled') return null;
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
      // other / bilinmeyen: sunucunun yazdığı serbest metin ham haliyle (web).
      const raw = order.cancelReason?.trim();
      return raw ? raw : null;
    }
  }
}
