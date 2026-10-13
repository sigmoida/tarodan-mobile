import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { qk } from "@/lib/query";
import { EXPIRED_FILTER, listingFilterParams } from "../_lib/types";

/**
 * `GET /products/my` gövdesinden toplam: sayfalı yanıtın `meta.total`ı (apps/api
 * `paginate`: `{ data, meta: { total, page, limit, totalPages } }`). `meta` yoksa
 * (eski/özel yanıt) gelen satır sayısına düşer.
 */
export function readListingsTotal(body: unknown): number {
  const b = body as { meta?: { total?: unknown }; data?: unknown } | unknown[] | null | undefined;
  if (Array.isArray(b)) return b.length;
  const total = b?.meta?.total;
  if (typeof total === "number" && Number.isFinite(total)) return total;
  return Array.isArray(b?.data) ? (b.data as unknown[]).length : 0;
}

/**
 * "Süresi dolan" sayacı (chip + banner). Tüm listeyi çekmek yerine `limit=1`
 * istenir ve toplam `meta.total`dan okunur → 100'de tavanlanmaz, tek satırlık yük.
 * Sunucu `GET /products/my/stats` `counts`una `expired` eklerse bu sorgu kalkar.
 */
export function useExpiredCount() {
  return useQuery({
    queryKey: qk.products.myListingsExpiredCount,
    queryFn: async (): Promise<number> => {
      const response = await productsApi.getMyListings({
        limit: 1,
        ...listingFilterParams(EXPIRED_FILTER),
      });
      return readListingsTotal(response.data);
    },
    retry: 1,
  });
}
