import { useQuery } from '@tanstack/react-query';
import { messagesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { parseDailyLimit, viewDailyLimit } from '@/lib/messaging/dailyLimit';

/**
 * GET /messages/daily-limit — günlük mesaj hakkı (sunucu tek kaynak).
 *
 * Eskiden limit üyelik katmanı tablosundan (`limits.maxMessagesPerDay`) ve
 * oturum boyunca artan yerel bir sayaçtan türetiliyordu; ikisi de sunucudaki
 * gerçek sayımla uyuşmuyordu. Limit bilinmiyorsa (yükleniyor/hata) istemci
 * ENGELLEMEZ — sunucu limiti zaten uygular ve çevrilmiş hata döner.
 */
export function useDailyMessageLimit() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const query = useQuery({
    queryKey: qk.messaging.dailyLimit,
    enabled: isAuthenticated,
    // Global staleTime 5 dk; sayaç gönderimle ve gün dönümüyle değişir.
    staleTime: 30 * 1000,
    queryFn: async () => {
      const res = await messagesApi.getDailyLimit();
      return parseDailyLimit(res.data);
    },
  });
  return { ...viewDailyLimit(query.data), isLoading: query.isLoading, refetch: query.refetch };
}
