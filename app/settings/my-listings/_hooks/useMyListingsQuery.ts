import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { qk } from "@/lib/query";
import { listingFilterParams, type FilterType, type Listing } from "../_lib/types";

/**
 * Satıcının ilan listesi (sekmeye göre). "Süresi dolan" sekmesi sunucuda
 * `status=inactive&inactiveReason=expired` olduğundan sayaç da aynı sorgudan
 * okunur — aynı anahtar ekran ve banner arasında tek istek olarak paylaşılır.
 */
export function useMyListingsQuery(filter: FilterType) {
  return useQuery({
    queryKey: qk.products.myListings(filter),
    queryFn: async (): Promise<Listing[]> => {
      const response = await productsApi.getMyListings({
        limit: 100,
        ...listingFilterParams(filter),
      });
      return response.data?.data || response.data || [];
    },
    retry: 1,
  });
}
