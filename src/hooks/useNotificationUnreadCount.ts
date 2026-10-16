import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { qk } from '@/lib/query';

/**
 * Okunmamış bildirim sayısı (rozet sayaçları). TEK sorgu tanımı: ana sayfa rozetleri
 * (`useHomeBadges`) ve marka barı (`useShellCounts`) aynı anahtarı (`qk.notifications.unread`)
 * ve gövdeyi paylaşır → tek önbellek girdisi, tek ağ isteği. Hata → 0 (rozet gizlenir).
 * `enabled` kapalıyken (misafir) 0 döner.
 */
export function useNotificationUnreadCount(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: qk.notifications.unread,
    enabled,
    // Yoklama kendi `refetchInterval`'ı ile DEĞİL: rozetli odaktaki ekranların ortak tek döngüsü
    // (`useBadgePoll`) tazeler; push / soket olayları `invalidateBadgeCounts` ile anında tazeler.
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
  return enabled && typeof data === 'number' ? data : 0;
}
