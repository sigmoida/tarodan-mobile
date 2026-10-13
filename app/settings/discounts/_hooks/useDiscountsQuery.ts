import { useQuery } from '@tanstack/react-query';
import { discountsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import type { Discount } from '../_lib/types';

/** Satıcının indirimleri (en çok 100) — liste ve düzenleme ekranının ORTAK sorgusu. */
export function useDiscountsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: qk.membership.discounts,
    queryFn: async () => {
      const response = await discountsApi.getAll({ limit: 100 });
      // Yanıt `{ items }`, `{ data }` ya da çıplak dizi olabilir.
      const data = response.data as { items?: unknown; data?: unknown } | undefined;
      const items = data?.items ?? data?.data ?? data ?? [];
      return Array.isArray(items) ? (items as Discount[]) : [];
    },
    enabled: isAuthenticated,
  });
}

/** Düzenleme ekranı: liste önbelleğinden (derin bağlantıda çekerek) tek indirim. */
export function useDiscount(id: string | undefined) {
  const query = useDiscountsQuery();
  return {
    discount: query.data?.find((d) => d.id === id) ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
