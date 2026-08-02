import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, type OrderQuoteResponse } from '@/lib/api';
import { qk } from '@/lib/query';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useCartSync } from '@/hooks/useCartSync';
import { useServerCart } from '@/hooks/useServerCart';

/**
 * Cart controller — owns the cart store bindings, the expired-item cleanup, the
 * buyer-fee quote query, and the totals + quantity/remove handlers. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useCart() {
  const { items, getSubtotal, getItemCount, cleanExpiredItems } = useCartStore();
  // Yazmalar sunucu sepetine de aynalanır (üyede); okuma yerel store'dan.
  const sync = useCartSync();
  const { byProductId } = useServerCart();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Clean expired items on mount
  useEffect(() => {
    cleanExpiredItems();
  }, []);

  const subtotal = getSubtotal();
  const itemCount = getItemCount();

  // Platform hizmet bedeli (komisyon) — backend quote'tan, sepette de net göster.
  // `pricing.summary`'den AYNEN: istemci tarafında hesaplanan/yuvarlanan para
  // değeri yok (kargo hariç — checkout adımında hesaplanır, burada gösterilmez).
  const quoteQuery = useQuery({
    queryKey: qk.checkout.quote(items.map((it) => `${it.productId}:${it.quantity}`).join(',')),
    queryFn: async () => {
      const res = await ordersApi.getQuote({
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      });
      return (res.data ?? {}) as OrderQuoteResponse;
    },
    enabled: items.length > 0,
    staleTime: 60_000,
  });
  const summary = quoteQuery.data?.pricing?.summary;
  const buyerFee = Number(summary?.serviceFeeAmount ?? 0);
  // Sepet önizlemesi kargoyu içermez (checkout'ta belirlenir); ürün ara toplamı +
  // hizmet bedeli, ikisi de sunucudan — burada yalnızca toplamaları var, aritmetik yok.
  const total = summary ? Number(summary.productAmount) + Number(summary.serviceFeeAmount) : subtotal;

  const handleRemove = (itemId: string) => {
    sync.removeItem(itemId);
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      sync.setQuantity(itemId, item.quantity + delta);
    }
  };

  /** Satır bazlı sunucu stok uyarısı — yalnız üyede dolu gelir. */
  const stockWarningFor = (productId: string) => {
    const line = byProductId.get(productId);
    if (!line) return null;
    if (line.isAvailable === false) return 'Bu ürün şu anda stokta yok';
    return line.stockWarning ?? null;
  };

  return {
    items,
    isAuthenticated,
    subtotal,
    itemCount,
    buyerFee,
    total,
    handleRemove,
    handleQuantityChange,
    stockWarningFor,
  };
}

export type CartController = ReturnType<typeof useCart>;
