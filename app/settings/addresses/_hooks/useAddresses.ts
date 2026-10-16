import { useQuery } from '@tanstack/react-query';
import { useRefresh } from '@/hooks/useRefresh';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { resolveMaxAddresses } from '@/lib/addressLimit';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import type { Address } from '../_lib/types';

/**
 * Kayıtlı adresler sorgusu — liste ve düzenleme ekranının ORTAK kaynağı.
 *
 * Hata YUTULMAZ: anahtar `qk.user.addresses` ilan formunun kargo çıkış adresi
 * kapısıyla ORTAK; `[]` önbelleğe yazılırsa satıcı "adres yok" diye engellenir.
 */
export function useAddressesQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: qk.user.addresses,
    queryFn: async (): Promise<Address[]> => {
      const response = await api.get('/users/me/addresses');
      return response.data?.data || response.data || [];
    },
    enabled: isAuthenticated,
  });
}

/**
 * Liste ekranının sorgu hook'u: adresler + limit + çekip yenileme; ekrana dönüşte
 * (ör. form ekranından) veri bayatsa tazeler.
 */
export function useAddresses() {
  const { isAuthenticated, limits } = useAuthStore();
  const query = useAddressesQuery();
  const { refetch } = query;
  const { refreshing, onRefresh } = useRefresh(refetch);

  // Ekrana dönüşte yalnız bayatsa tazele: form ekranındaki kaydet/sil `qk.user.addresses`'i
  // invalidate ettiği için dönüşte liste yine tazelenir; her odakta istek gereksizdi.
  useRefetchStaleOnFocus([qk.user.addresses], isAuthenticated);

  return {
    isAuthenticated,
    addresses: query.data ?? [],
    // Sunucu limiti (3) tek kaynaktan; bilinmeyen/sınırsız → Infinity (sayaç gizli).
    maxAddresses: resolveMaxAddresses(limits?.maxAddresses),
    isLoading: query.isLoading,
    /** Liste alınamadı (önbellekte de yok) — "kayıtlı adres yok" değil, ErrorState. */
    loadFailed: query.isError && !query.data,
    retry: () => {
      void refetch();
    },
    refreshing,
    onRefresh,
  };
}

/** Düzenleme ekranı: liste önbelleğinden (yoksa çekerek) tek adres. */
export function useAddress(id: string | undefined) {
  const query = useAddressesQuery();
  return {
    address: query.data?.find((a) => a.id === id) ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
