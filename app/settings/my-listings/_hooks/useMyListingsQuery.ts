import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { qk } from "@/lib/query";
import {
  flattenPagesUnique,
  nextPageFromInfo,
  readPageInfo,
  type PageInfo,
} from "@/lib/query/infinite";
import { listingFilterParams, type FilterType, type Listing } from "../_lib/types";

/** Sayfa boyutu. */
const PAGE_SIZE = 20;

type ListingsPage = PageInfo & { listings: Listing[] };

/**
 * Satıcının ilan listesi (sekmeye göre), sayfalı (`GET /products/my` → `{ data, meta }`).
 * "Süresi dolan" sekmesi sunucuda `status=inactive&inactiveReason=expired` olduğundan sayaç da
 * aynı uçtan okunur (`useExpiredCount`, `limit=1`). Dönen `listings` sayfalar arası tekilleştirilir.
 */
export function useMyListingsQuery(filter: FilterType) {
  const query = useInfiniteQuery({
    queryKey: qk.products.myListings(filter),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<ListingsPage> => {
      const page = pageParam as number;
      const response = await productsApi.getMyListings({
        limit: PAGE_SIZE,
        page,
        ...listingFilterParams(filter),
      });
      return {
        listings: response.data?.data || response.data || [],
        ...readPageInfo(response.data, page),
      };
    },
    getNextPageParam: nextPageFromInfo,
    // NOT: `maxPages` bilerek YOK (arama ekranıyla aynı gerekçe, `useSearch`): `getPreviousPageParam` olmadan
    // ~100 satırdan sonra 1. sayfa düşer ve liste sıçrar; kart başına yük hafif, tüm sayfaları tutmak sorun değil.
    retry: 1,
  });

  // Sayfalar arası ofset kayması aynı ilanı iki kez getirebilir → kimliğe göre tekilleştir.
  const listings: Listing[] = useMemo(
    () => flattenPagesUnique(query.data?.pages, (p) => p.listings, (l) => l.id),
    [query.data],
  );

  // Alan alan döner (`...query` yayması TanStack'in izlenen özelliklerini hepsine abone ederdi).
  return {
    listings,
    isLoading: query.isLoading,
    // Hata ekranı yalnız gösterilecek veri YOKKEN: sonraki sayfa / yenileme hatası listeyi silmez.
    isError: query.isError && query.data === undefined,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
