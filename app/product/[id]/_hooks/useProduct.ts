import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { productDetailQuery } from '@/lib/product/detailQuery';
import { findCachedListProduct } from '@/lib/product/listCache';
import type { Product } from '../_lib/types';

/**
 * Ürün detayı sorgusu (`productDetailQuery`: GET /products/:id, sahibe-özel uca düşüş, yalnız
 * 404 → `null`, ağ/5xx → hata). İlk kare: önbellekteki bir listede bu ürünün kartı varsa
 * `placeholderData` (başlık / fiyat / galeri) — `isPlaceholderData` iken tam veri isteyen bölümler
 * iskelet. Görüntülenme ürün başına 1 kez, gerçek veri gelince ARKA PLANDA sayılır (kritik yolda
 * değil; dönen sayı detay önbelleğine yazılır). Listeler görüntülenmede invalidate EDİLMEZ (her
 * açılışta anasayfa rayları / arama yeniden çekiliyordu).
 */
export function useProduct(productId: string, isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  // Yer tutucu bağlanırken bir kez aranır (her sonuç hesabında tüm liste önbelleği taranmasın).
  const placeholder = useMemo(
    () => findCachedListProduct(queryClient, productId) as Product | undefined,
    [queryClient, productId],
  );

  const query = useQuery({
    ...productDetailQuery(productId, isAuthenticated),
    placeholderData: placeholder,
  });

  const product = query.isPlaceholderData ? undefined : query.data;
  const countedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product || countedRef.current === productId) return;
    countedRef.current = productId;
    // `Promise.resolve().then`: uç taklit edilmemiş / senkron atan istemci de yutulsun.
    Promise.resolve()
      .then(() => productsApi.incrementView(productId))
      .then((resp) => {
        const body = resp?.data as { viewCount?: unknown; data?: { viewCount?: unknown } } | undefined;
        const vc = body?.viewCount ?? body?.data?.viewCount;
        if (typeof vc !== 'number') return;
        queryClient.setQueryData<Product | null>(qk.products.detail(productId), (old) =>
          old ? { ...old, viewCount: vc } : old,
        );
      })
      .catch(() => {
        // görüntülenme sayımı kritik değil — yoksay
      });
  }, [product, productId, queryClient]);

  return query;
}
