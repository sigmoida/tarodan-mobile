import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

/**
 * Marka barı sayaçları: sepet (yerel sepet deposu) ve okunmamış bildirim. Bildirim sorgusu
 * ana sayfa rozetleriyle (`app/(tabs)/_hooks/useHomeBadges`) AYNI anahtar ve gövde: tek
 * önbellek girdisi paylaşılır. (Dalga 2: useHomeBadges bunu kullanacak şekilde sadeleşebilir.)
 */
export function useShellCounts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { data: unread } = useQuery({
    queryKey: qk.notifications.unread,
    enabled: isAuthenticated,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      try {
        const response = await notificationsApi.getUnreadCount();
        const body = response.data as { count?: number; data?: { count?: number } } | undefined;
        return body?.count ?? body?.data?.count ?? 0;
      } catch {
        return 0;
      }
    },
  });
  return {
    cartCount,
    notificationCount: isAuthenticated && typeof unread === 'number' ? unread : 0,
  };
}
