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
      const data: any = response.data;
      const items: Discount[] = data?.items ?? data?.data ?? data ?? [];
      return Array.isArray(items) ? items : [];
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
