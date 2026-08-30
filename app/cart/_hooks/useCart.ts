import i18n from '@/i18n/config';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, type OrderQuoteResponse } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { serverAmount } from '@/utils/format';
import { indexQuoteLines } from '@/utils/quoteLines';
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
  // Seçim store'da: checkout ayrı bir rota ve aynı kaynaktan okuyor. Ekranda
  // `useState` olsaydı ödeme adımı seçimi göremezdi.
  const deselectedIds = useCartStore((s) => s.deselectedIds);
  const toggleSelected = useCartStore((s) => s.toggleSelected);
  const setAllSelected = useCartStore((s) => s.setAllSelected);

  /**
   * Fiyatlanan ve ödenecek satırlar. `items` yerine BUNLAR quote'a gider —
   * uç zaten yalnız gönderilen satırları fiyatlıyor, o yüzden seçim tek başına
   * istemci tarafında bitiyor.
   */
  const selected = useMemo(
    () => items.filter((i) => !deselectedIds.includes(i.id)),
    [items, deselectedIds],
  );
  const allSelected = items.length > 0 && selected.length === items.length;
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
    queryKey: qk.checkout.quote(selected.map((it) => `${it.productId}:${it.quantity}`).join(',')),
    queryFn: async () => {
      const res = await ordersApi.getQuote({
        items: selected.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      });
      return unwrapEnvelope<OrderQuoteResponse>(res);
    },
    enabled: selected.length > 0,
    staleTime: 60_000,
    // 4xx yeniden denenmez — checkout ile AYNI yüklem (tek kaynak, §5). Sepet
    // ve checkout aynı queryKey'i paylaşıyor; yüklem burada eksik olsaydı aynı
    // sorgu iki ekranda farklı sayıda istek atardı.
    retry: retryUnlessClientError,
  });
  const summary = quoteQuery.data?.pricing?.summary;
  // ————————————————————————————————————————————————————————————————
  // BAĞLAYICI KISIT: parayla ilgili hiçbir değer istemcide hesaplanmaz.
  // Eskiden buradaki `total` `productAmount + serviceFeeAmount` idi — hiçbir
  // sunucu alanına karşılık gelmeyen, istemcide üretilmiş bir tutar; üstelik
  // "Ara Toplam" yerel `getSubtotal()`, "Toplam" sunucu tabanlıydı, ikisi
  // ayrıştığında satırlar tutmuyordu. Artık dördü de `pricing.summary`'den AYNEN.
  // Kapı ALAN seviyesinde (`serverAmount`): `summary` gelip `total: null` olsaydı
  // `Number(null)` = 0 ile "0,00 TL" basılırdı. Sayı değilse `null` → yer tutucu.
  // ————————————————————————————————————————————————————————————————
  const productAmount = serverAmount(summary?.productAmount);
  const shippingAmount = serverAmount(summary?.shippingAmount);
  const serviceFeeAmount = serverAmount(summary?.serviceFeeAmount);
  const total = serverAmount(summary?.total);

  /**
   * Satır birim fiyatı — sunucunun `items[].unitPrice`'ı. Sepetteki `item.price`
   * ekleme anında donuyor ve 24 saat saklanıyor; kampanya penceresi sepette
   * beklerken kapanırsa satırda eski (indirimli) fiyat, özette yeni ara toplam
   * görünürdü. Sunucu satırı yoksa `null` → ekran yer tutucu basar.
   */
  const quoteLines = useMemo(() => indexQuoteLines(quoteQuery.data?.items), [quoteQuery.data]);
  const unitPriceFor = (productId: string): number | null =>
    quoteLines.get(productId)?.unitPrice ?? null;

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
    if (line.isAvailable === false) return i18n.t('cart.outOfStock');
    return line.stockWarning ?? null;
  };

  return {
    items,
    isAuthenticated,
    itemCount,
    /** Ödemeye girecek satırlar; seçim kutuları ve ödeme kapısı bunu okur. */
    selectedItems: selected,
    selectedCount: selected.length,
    allSelected,
    isSelected: (itemId: string) => !deselectedIds.includes(itemId),
    toggleSelected,
    toggleSelectAll: () => setAllSelected(!allSelected),
    // Fiyat — hepsi `pricing.summary`'nin aynısı; yoksa `null` (yer tutucu).
    productAmount,
    shippingAmount,
    serviceFeeAmount,
    total,
    /** Satır birim fiyatı — sunucunun `items[].unitPrice`'ı; yoksa `null`. */
    unitPriceFor,
    quoteLoading: quoteQuery.isLoading,
    /**
     * Quote hatası — sepet de checkout ile AYNI çıkış yolunu gösterir
     * (paylaşılan `ErrorState` + "Tekrar Dene", CLAUDE.md §11). Bu olmadan
     * kullanıcı dört satırın da "—" olduğu, sebebi ve çıkışı olmayan bir
     * sepet görüyordu.
     */
    quoteError: quoteQuery.isError,
    retryQuote: () => {
      void quoteQuery.refetch();
    },
    handleRemove,
    handleQuantityChange,
    stockWarningFor,
  };
}

export type CartController = ReturnType<typeof useCart>;
