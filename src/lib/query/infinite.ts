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

/** Sayfalı yanıtın (`{ data, meta: { page, totalPages } }`) sayfa bilgisi. */
export interface PageInfo {
  page: number;
  totalPages: number;
}

/**
 * Sayfalı API gövdesinden `meta`yı okur. `meta` yoksa (özel/eski yanıt) "tek sayfa" sayılır →
 * `getNextPageParam` undefined döner, sonsuz kaydırma devreye girmez.
 */
export function readPageInfo(body: unknown, requestedPage: number): PageInfo {
  const m = (body as { meta?: { page?: unknown; totalPages?: unknown } } | null | undefined)?.meta;
  const page = typeof m?.page === 'number' ? m.page : requestedPage;
  const totalPages = typeof m?.totalPages === 'number' ? m.totalPages : 1;
  return { page, totalPages };
}

/**
 * `getNextPageParam` için: `maxPages` baştaki sayfaları düşürebildiğinden `all.length` değil
 * sayfanın KENDİ numarası baz alınır.
 */
export function nextPageFromInfo(last: PageInfo): number | undefined {
  return last.page < last.totalPages ? last.page + 1 : undefined;
}

/**
 * Sayfaları tek listeye düzleştirir; aynı anahtar tekrar gelirse (sayfalar arasında yeni kayıt
 * eklenince ofset kayar) ilkini tutar — `keyExtractor` çakışması / çift satır olmasın.
 */
export function flattenPagesUnique<P, T>(
  pages: readonly P[] | undefined,
  getItems: (page: P) => readonly T[],
  getKey: (item: T) => string,
): T[] {
  if (!pages) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of pages) {
    for (const item of getItems(p)) {
      const k = getKey(item);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}
