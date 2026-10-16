import { theme } from '@/ui';
import type { IconName } from '@/ui';

// NOT: Backend bildirim tipleri küçük snake_case'tir (notification.dto.ts
// NotificationType). Eskiden burada BÜYÜK_HARF case'ler vardı, hiçbiri
// eşleşmeyip her bildirim varsayılan zile düşüyordu.
export function getIconForType(type: string): { icon: IconName; color: string; bg: string } {
  switch (type) {
    // ---- Siparişler ----
    case 'order_created':
      return { icon: 'shopping-cart', color: theme.colors.primary[500], bg: theme.colors.primary[50] };
    case 'order_paid':
    case 'payment_received':
      return { icon: 'credit-card', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'order_shipped':
    case 'trade_shipped':
    case 'order_delivered_confirm':
    case 'refund_return_opened':
      return { icon: 'cube', color: theme.colors.info[500], bg: theme.colors.info[100] };
    case 'order_delivered':
    case 'order_completed':
    case 'order_auto_completed':
    case 'order_manually_confirmed':
    case 'product_approved':
    case 'product_sold':
    case 'refund_approved':
      return { icon: 'check-circle', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'order_force_completed_by_admin':
      return { icon: 'shield-check', color: theme.colors.info[500], bg: theme.colors.info[100] };
    case 'order_cancelled':
    case 'order_cancelled_by_platform':
    case 'order_cancelled_by_platform_seller':
    case 'trade_cancelled_by_platform':
    case 'trade_cancelled':
    case 'order_cancelled_out_of_stock':
    case 'offer_cancelled_out_of_stock':
    case 'offer_counter_declined':
    case 'product_rejected':
    case 'trade_rejected':
    case 'trade_auto_cancelled':
    case 'reservation_expired':
      return { icon: 'x-circle', color: theme.colors.danger[500], bg: theme.colors.danger[100] };
    case 'order_refunded':
    case 'refund_completed':
    case 'seller_did_not_ship_refunded':
    case 'payment_released':
      return { icon: 'banknotes', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'refund_rejected':
    case 'refund_cancelled':
      return { icon: 'arrow-uturn-left', color: theme.colors.danger[500], bg: theme.colors.danger[100] };
    case 'order_preparing_deadline_warning':
    case 'order_preparing_extended':
    case 'order_preparing_extended_seller':
    case 'offer_extended':
    case 'trade_response_extended':
    case 'trade_payment_extended':
    case 'trade_payment_extended_paid':
    case 'order_reservation_released':
    case 'offer_expired':
    case 'membership_expiring':
    case 'membership_expired':
    case 'listing_expiring':
    case 'listing_expired':
    case 'refund_disputed':
    case 'trade_dispute_opened':
      return { icon: 'clock', color: theme.colors.warning[500], bg: theme.colors.warning[100] };

    // ---- Teklifler ----
    case 'offer_received':
      return { icon: 'tag', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'offer_counter':
      return { icon: 'tag', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'offer_accepted':
      return { icon: 'hand-thumb-up', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'offer_rejected':
    case 'offer_auto_rejected':
      return { icon: 'hand-thumb-down', color: theme.colors.danger[500], bg: theme.colors.danger[100] };

    // ---- Takaslar ----
    case 'trade_received':
    case 'trade_counter':
      return { icon: 'arrows-right-left', color: theme.colors.info[500], bg: theme.colors.info[100] };
    case 'trade_accepted':
    case 'trade_completed':
    case 'trade_dispute_resolved':
      return { icon: 'arrows-right-left', color: theme.colors.success[500], bg: theme.colors.success[100] };

    // ---- Mesaj ----
    case 'new_message':
      return { icon: 'chat-bubble-left-right', color: theme.colors.info[500], bg: theme.colors.info[100] };

    // ---- Favori / stok ----
    case 'price_drop':
      return { icon: 'arrow-trending-down', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'wishlist_item_sold':
    case 'wishlist_sold':
      // Favorideki ürün satıldı: kalp (product_liked) ile karışmasın -> "artık yok" işareti.
      return { icon: 'no-symbol', color: theme.colors.danger[500], bg: theme.colors.danger[100] };
    case 'back_in_stock':
      return { icon: 'arrow-path', color: theme.colors.success[500], bg: theme.colors.success[100] };

    // ---- Sosyal ----
    case 'new_follower':
      return { icon: 'user-plus', color: theme.colors.primary[500], bg: theme.colors.primary[50] };
    case 'seller_new_listing':
      return { icon: 'plus-circle', color: theme.colors.info[500], bg: theme.colors.info[100] };
    case 'collection_liked':
    case 'product_liked':
      return { icon: 'heart', color: theme.colors.primary[500], bg: theme.colors.primary[50] };

    // ---- Değerlendirme ----
    case 'review_received':
      return { icon: 'star', color: theme.colors.warning[500], bg: theme.colors.warning[100] };

    // ---- Üyelik / öne çıkarma / kampanya ----
    case 'membership_upgraded':
      return { icon: 'check-badge', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'listing_views_milestone':
      return { icon: 'eye', color: theme.colors.info[500], bg: theme.colors.info[100] };
    case 'boost_expired':
      return { icon: 'rocket-launch', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'promotion':
      return { icon: 'gift', color: theme.colors.success[500], bg: theme.colors.success[100] };
    case 'special_offer':
      return { icon: 'sparkles', color: theme.colors.success[500], bg: theme.colors.success[100] };

    // ---- Genel ----
    case 'welcome':
      return { icon: 'sparkles', color: theme.colors.primary[500], bg: theme.colors.primary[50] };
    case 'system_announcement':
      return { icon: 'megaphone', color: theme.colors.info[500], bg: theme.colors.info[100] };

    default:
      return { icon: 'bell', color: theme.colors.primary[500], bg: theme.colors.primary[50] };
  }
}
