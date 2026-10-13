import { useFavorites } from '@/hooks/useFavorites';
import { useUnreadCountQuery } from '@/hooks/messaging';
import { useNotificationUnreadCount } from '@/hooks/useNotificationUnreadCount';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

/**
 * Kabuk sayaçlarının TEK kaynağı (üst bar + alt menü + sekme kökleri): sepet adedi (yerel sepet
 * deposu), okunmamış bildirim, okunmamış mesaj ve favori sayısı. Sunucu sayaçları React Query
 * önbelleğinden gelir; misafirde bildirim 0'dır, mesaj/favori sorguları kendi `enabled` kapısını taşır.
 */
export function useShellCounts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const notificationCount = useNotificationUnreadCount(isAuthenticated);
  const { data: messageCount = 0 } = useUnreadCountQuery();
  const { items: favoriteItems } = useFavorites();
  return { cartCount, notificationCount, messageCount, favoriteCount: favoriteItems.length };
}
