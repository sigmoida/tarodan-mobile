import { useQuery } from '@tanstack/react-query';
import { offersApi, tradesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useScreenFocused } from '@/ui';
import { useBadgePoll } from '@/hooks/useBadgePoll';

/**
 * Profil menüsü rozetleri (yanıt bekleyen teklif / takas). Sepet, bildirim, mesaj ve favori
 * sayaçları kabuğun tek kaynağında: `useShellCounts` (`@/components/shell/useShellCounts`).
 */
export function useHomeBadges(isAuthenticated: boolean) {
  // Profil sekmesi bir kez açılınca monte kalır: sorgular yalnız ekran ODAKTAYKEN etkin (başka
  // sekmede / üstüne ekran itilmişken yoklanmaz; odak dönünce bayatsa tazelenir). Yoklama, kabuk
  // sayaçlarıyla ORTAK tek 60 sn döngüde (`useBadgePoll`) — sorgu başına `refetchInterval` yok.
  const focused = useScreenFocused();
  useBadgePoll(focused);
  const enabled = isAuthenticated && focused;
  /** Profil menüsü rozetleri: yanıt bekleyen teklif / takas. Bildirim sayacıyla
   *  aynı desen — hata durumunda 0, rozet gizlenir. */
  const { data: pendingOffers = 0 } = useQuery({
    queryKey: qk.offers.pendingCount,
    enabled,
    queryFn: async () => {
      try {
        const res = await offersApi.getPendingCount();
        const body = res.data as { count?: number; data?: { count?: number } } | undefined;
        return body?.count ?? body?.data?.count ?? 0;
      } catch {
        return 0;
      }
    },
  });

  const { data: pendingTrades = 0 } = useQuery({
    queryKey: qk.trades.pendingCount,
    enabled,
    queryFn: async () => {
      try {
        const res = await tradesApi.getPendingCount();
        const body = res.data as { count?: number; data?: { count?: number } } | undefined;
        return body?.count ?? body?.data?.count ?? 0;
      } catch {
        return 0;
      }
    },
  });

  return { pendingOffers, pendingTrades };
}
