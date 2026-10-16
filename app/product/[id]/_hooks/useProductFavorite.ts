import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { patchCachedListProduct } from '@/lib/product/listCache';
import type { Product } from '../_lib/types';

/**
 * Favori (beğeni) durumu + toggle. Akış (misafir uyarısı + giriş, ekle/çıkar, toast, çift dokunma
 * kilidi, detay cache'inde beğeni sayısı ±1) ürün kartıyla ORTAK: `useFavoriteToggle`.
 * Kalp durumu favorites cache'inden reaktif okunur — kartta değişen favori detayda da aynı görünür
 * (ve tersi). Beğeni sayısı detay cache'indeki `likeCount` (toggle onu ±1 günceller; refetch yok,
 * görüntülenme yeniden sayılmaz). Açılışta ayrıca favori refetch'i YOK: staleTime yeterli ve
 * uçuştaki bir kart toggle'ının iyimser durumunu ezerdi.
 * Detaya özel: başarılı toggle'da listelerdeki kartların beğeni sayısı da YERİNDE ±1 yamanır
 * (listeler invalidate edilmez — bağlı raylar / arama yeniden çekilmesin).
 */
export function useProductFavorite({
  product,
  productId,
  isAuthenticated,
}: {
  product: Product | null | undefined;
  productId: string;
  isAuthenticated: boolean;
}) {
  const queryClient = useQueryClient();
  const { favoriteIds, toggle: toggleFavorite } = useFavoriteToggle();
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const toggle = async () => {
    setFavoriteLoading(true);
    try {
      const result = await toggleFavorite(productId);
      if (result === 'added' || result === 'removed') {
        const delta = result === 'added' ? 1 : -1;
        patchCachedListProduct(queryClient, productId, (p) =>
          typeof p.likeCount === 'number' ? { ...p, likeCount: Math.max(0, p.likeCount + delta) } : p,
        );
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const isFavorite = isAuthenticated && favoriteIds.has(productId);
  const favoriteCount = product?.likeCount ?? 0;
  return { isFavorite, favoriteCount, favoriteLoading, toggle };
}
