import { useNotificationUnreadCount } from '@/hooks/useNotificationUnreadCount';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

/**
 * Marka barı sayaçları: sepet (yerel sepet deposu) ve okunmamış bildirim. Bildirim sorgusu
 * ana sayfa rozetleriyle ortak tek hook'tan gelir (`useNotificationUnreadCount`).
 */
export function useShellCounts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const notificationCount = useNotificationUnreadCount(isAuthenticated);
  return { cartCount, notificationCount };
}
