import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Sonsuz liste çekip-yenilemesinden ÖNCE önbelleği ilk sayfaya kırpar.
 *
 * `refetch()` yüklü TÜM sayfaları sırayla yeniden çeker (5 sayfa yüklüyse 5 istek). Çekip-yenile
 * listenin en üstünde yapıldığından ilk sayfayı bırakıp yenilemek görsel kayıp yaratmaz ve tek
 * istek atar (TanStack v5 önerisi; arama ekranının `refreshFirstPage`'iyle aynı yöntem).
 */
export function trimInfiniteToFirstPage(queryClient: QueryClient, queryKey: QueryKey): void {
  queryClient.setQueryData<InfiniteData<unknown>>(queryKey, (old) =>
    old && old.pages.length > 1
      ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) }
      : old,
  );
}
