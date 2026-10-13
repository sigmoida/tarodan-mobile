import { useQuery } from '@tanstack/react-query';
import { addressesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import {
  dispatchAddressStatus,
  type DispatchAddressCandidate,
  type DispatchAddressStatus,
} from '../_lib/dispatchAddress';

/**
 * Satıcının kargo çıkış adresi taşıyıcıya gönderilebilir mi (web
 * `useDispatchAddress`). `qk.user.addresses` Adreslerim ekranıyla ORTAK: orada
 * adres eklenince/düzeltilince sorgu tazelenir ve kapı kendiliğinden açılır.
 */
export function useDispatchAddress(enabled: boolean): DispatchAddressStatus & {
  isLoading: boolean;
  /** Adresler okunamadı (ve elde eski veri yok) — durum BİLİNMİYOR, "eksik" değil. */
  isError: boolean;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: qk.user.addresses,
    queryFn: async () => {
      const res = await addressesApi.getAll();
      return (res.data?.data || res.data || []) as DispatchAddressCandidate[];
    },
    enabled,
  });
  return {
    ...dispatchAddressStatus(Array.isArray(query.data) ? query.data : []),
    isLoading: query.isLoading,
    isError: query.isError && query.data === undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}
