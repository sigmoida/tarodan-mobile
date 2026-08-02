import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, type OrderQuoteResponse } from '@/lib/api';
import { qk } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
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
  const { items, getItemCount, cleanExpiredItems } = useCartStore();
  // Yazmalar sunucu sepetine de aynalanır (üyede); okuma yerel store'dan.
  const sync = useCartSync();
  const { byProductId } = useServerCart();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Clean expired items on mount
  useEffect(() => {
    cleanExpiredItems();
  }, []);

  const itemCount = getItemCount();

  // Fiyat kırılımı checkout ile AYNI uçtan ve AYNI anahtardan gelir — sepet ile
  // ödeme ekranı arasında tek bir doğru vardır.
  const quoteQuery = useQuery({
    queryKey: qk.checkout.quote(items.map((it) => `${it.productId}:${it.quantity}`).join(',')),
    queryFn: async () => {
      const res = await ordersApi.getQuote({
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      });
      return unwrapEnvelope<OrderQuoteResponse>(res);
    },
    enabled: items.length > 0,
    staleTime: 60_000,
  });
  const summary = quoteQuery.data?.pricing?.summary;
  const hasQuote = summary != null;
  // ————————————————————————————————————————————————————————————————
  // BAĞLAYICI KISIT: parayla ilgili hiçbir değer istemcide hesaplanmaz.
  // Eskiden buradaki `total` `productAmount + serviceFeeAmount` idi — hiçbir
  // sunucu alanına karşılık gelmeyen, istemcide üretilmiş bir tutar; üstelik
  // "Ara Toplam" yerel `getSubtotal()`, "Toplam" sunucu tabanlıydı, ikisi
  // ayrıştığında satırlar tutmuyordu. Artık dördü de `pricing.summary`'den AYNEN.
  // Sunucu değeri yoksa `null` → ekran yer tutucu basar, yerel toplam BASILMAZ.
  // ————————————————————————————————————————————————————————————————
  const productAmount = hasQuote ? Number(summary!.productAmount) : null;
  const shippingAmount = hasQuote ? Number(summary!.shippingAmount) : null;
  const serviceFeeAmount = hasQuote ? Number(summary!.serviceFeeAmount) : null;
  const total = hasQuote ? Number(summary!.total) : null;

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
    itemCount,
    // Fiyat — hepsi `pricing.summary`'nin aynısı; yoksa `null` (yer tutucu).
    productAmount,
    shippingAmount,
    serviceFeeAmount,
    total,
    hasQuote,
    quoteLoading: quoteQuery.isLoading,
    handleRemove,
    handleQuantityChange,
    stockWarningFor,
  };
}

export type CartController = ReturnType<typeof useCart>;
