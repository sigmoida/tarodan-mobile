import { useQuery } from '@tanstack/react-query';
import { tradesApi, type TradePaymentQuote } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/**
 * Takas ödeme dökümü. v1 takasta uç 200 + boş gövde döndürür; bu HATA DEĞİL —
 * `quote` `null` kalır, kart çizilmez ve `isV2` bu `null`'a bakar.
 */
export function useTradePaymentQuote(id: string) {
  const query = useQuery({
    queryKey: qk.trades.paymentQuote(id),
    queryFn: async () => {
      const res = await tradesApi.getPaymentQuote(id);
      const body = unwrapEnvelope<Partial<TradePaymentQuote>>(res);
      // Boş gövde → v1. Yarım gövdeyi de v1 say: tek taraflı döküm çizilemez.
      if (!body?.initiator || !body?.receiver) return null;
      return body as TradePaymentQuote;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
  return { quote: query.data ?? null, isLoading: query.isLoading };
}
