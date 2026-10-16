import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { invalidateProductLists } from '../_lib/invalidate';
import type { Product } from '../_lib/types';

/**
 * Favori (beğeni) durumu + toggle. Akış (misafir uyarısı + giriş, ekle/çıkar, toast, çift dokunma
 * kilidi) ürün kartıyla ORTAK: `useFavoriteToggle`. Kalp durumu favorites cache'inden reaktif
 * okunur — kartta değişen favori detayda da aynı görünür (ve tersi).
 * Detaya özel: beğeni sayısı server likeCount'undan senkronlanır ve iyimser güncellenir; başarılı
 * toggle'da detay + listeler tazelenir (beğeni sayısı listelerde de görünür).
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
  const { favoriteIds, toggle: toggleFavorite, refetch } = useFavoriteToggle();

  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Detay açılınca favori listesini tazele (başka cihazda değişmiş olabilir).
  useEffect(() => {
    if (isAuthenticated && productId) void refetch();
  }, [isAuthenticated, productId, refetch]);

  // Beğeni sayısını server likeCount'undan senkronla.
  useEffect(() => {
    if (product) setFavoriteCount(product.likeCount ?? 0);
  }, [product]);

  const toggle = async () => {
    setFavoriteLoading(true);
    try {
      const result = await toggleFavorite(productId);
      if (result === 'added' || result === 'removed') {
        setFavoriteCount((c) => (result === 'added' ? c + 1 : Math.max(0, c - 1)));
        invalidateProductLists(queryClient);
        queryClient.invalidateQueries({ queryKey: qk.products.detail(productId) });
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const isFavorite = isAuthenticated && favoriteIds.has(productId);
  return { isFavorite, favoriteCount, favoriteLoading, toggle };
}
