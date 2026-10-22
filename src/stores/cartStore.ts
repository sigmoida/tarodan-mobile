import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  /** Sepete eklenirken yakalanan satın alınabilir stok (availableQuantity ?? quantity). +/- bunu aşamaz. */
  stock?: number | null;
  /** Sipariş başına azami adet (varsa). +/- bunu da aşamaz. */
  maxQuantityPerOrder?: number | null;
  imageUrl: string;
  brand?: string;
  scale?: string;
  seller: {
    id: string;
    displayName: string;
  };
  /** Son ekleme/adet değişikliği zamanı (bilgi amaçlı; sepet süre dolunca SİLİNMEZ). */
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  lastUpdated: number;
  isLoading: boolean;
  /**
   * "Hızlı Al" için sepetten bağımsız tek ürün. Checkout `?buyNow=1` ile açıldığında
   * sepet yerine bu ürün kullanılır; böylece sepet kirlenmez (web parite).
   * Kalıcı depoya yazılmaz (partialize) — uygulama yeniden açılınca sıfırlanır.
   */
  buyNowItem: CartItem | null;

  /**
   * Ödemeye GİRMEYECEK satırların id'leri. Seçim bilerek OPT-OUT tutuluyor:
   * varsayılan "hepsi seçili" ve sonradan eklenen satır kendiliğinden seçili
   * gelir. Opt-in bir liste olsaydı her ekleme yolunun (addItem / addToCart /
   * sunucudan senkron) listeyi ayrıca güncellemesi gerekirdi ve biri unutulunca
   * kullanıcı eklediği ürünü ödeyemezdi.
   *
   * Kalıcı depoya yazılmaz (partialize) — seçim oturumluk bir karardır.
   */
  deselectedIds: string[];

  /**
   * Yerel satırların sunucu sepetiyle birleştirilmesi bu kullanıcı için BEKLİYOR (kalıcı).
   * Misafir→üye geçişinde (giriş) ve üyenin aynalanan eklemesi geçici hatayla düştüğünde
   * konur; `useCartMergeOnLogin` birleştirmeyi kesin sonuca (başarı / satırın kesin reddi)
   * ulaşınca kaldırır. Soğuk açılış birleştirme tetiklemez — yalnız işaret varsa çalışır.
   */
  mergePendingFor: string | null;
  markMergePending: (userId: string) => void;
  /** Birleştirme bitti — yalnız işaret hâlâ bu kullanıcıya aitse kaldırılır. */
  clearMergePending: (userId: string) => void;

  // Actions
  /** `quantity` (varsayılan 1): ürün detayındaki adet seçici; stok/sipariş sınırını aşamaz. */
  addItem: (item: Omit<CartItem, 'id' | 'quantity' | 'addedAt'>, quantity?: number) => void;
  setBuyNow: (item: Omit<CartItem, 'id' | 'quantity' | 'addedAt'>, quantity?: number) => void;
  clearBuyNow: () => void;
  addToCart: (productId: string) => Promise<void>;
  removeItem: (itemId: string) => void;
  removeByProductId: (productId: string) => void;
  /**
   * Puts a removed line back where it was, with the same id, quantity and checkout selection,
   * unless the listing is in the cart again by then: the undo of a removal the server did not
   * apply (`useCartSync`). `at` is what `removeByProductId` changed: the line's index and whether
   * it was deselected.
   */
  restoreItem: (item: CartItem, at: { index: number; deselected: boolean }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  /**
   * Sunucunun bildirdiği taze satın alınabilir adedi satıra yazar (sepete eklerken donan
   * `stock` yerine). Adet seçici ve `updateQuantity` tavanı bu değerle hesaplanır.
   */
  syncStock: (productId: string, stock: number) => void;
  onPurchaseComplete: (productIds: string[]) => void;
  toggleSelected: (itemId: string) => void;
  setAllSelected: (selected: boolean) => void;

  /** Ödemeye girecek satırlar — quote da checkout da YALNIZ bunları görür. */
  selectedItems: () => CartItem[];
  isSelected: (itemId: string) => boolean;

  // Computed
  // NOT: `getSubtotal()` BİLEREK YOK. Yerel `price × quantity` toplamı hiçbir
  // sunucu alanına karşılık gelmiyor (sepetteki fiyat ekleme anında donuyor,
  // kampanya penceresi kapanabiliyor) ve bir zamanlar "Toplam" diye basılıyordu.
  // Para tutarları YALNIZCA `POST /orders/quote` yanıtından gelir.
  getItemCount: () => number;
  isInCart: (productId: string) => boolean;
}

export { maxAllowedQty } from './cartLimits';
import { maxAllowedQty } from './cartLimits';

/** Sepetten düşen satırların seçim kaydını da düşürür (bayat id birikmesin). */
function pruneDeselected(deselectedIds: string[], removedItemIds: string[]): string[] {
  return deselectedIds.filter((id) => !removedItemIds.includes(id));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastUpdated: Date.now(),
      isLoading: false,
      buyNowItem: null,
      deselectedIds: [],
      mergePendingFor: null,

      markMergePending: (userId: string) => {
        if (get().mergePendingFor !== userId) set({ mergePendingFor: userId });
      },

      clearMergePending: (userId: string) => {
        if (get().mergePendingFor === userId) set({ mergePendingFor: null });
      },

      setBuyNow: (item, quantity = 1) => {
        set({
          buyNowItem: {
            ...item,
            id: `buynow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quantity: Math.max(1, Math.min(quantity, maxAllowedQty(item))),
            addedAt: Date.now(),
          },
        });
      },

      clearBuyNow: () => {
        set({ buyNowItem: null });
      },

      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existingIndex = items.findIndex(i => i.productId === item.productId);

        if (existingIndex >= 0) {
          // Update quantity — taze stok bilgisini al, sınırı aşma
          const newItems = [...items];
          const merged: CartItem = {
            ...newItems[existingIndex],
            stock: item.stock,
            maxQuantityPerOrder: item.maxQuantityPerOrder,
          };
          merged.quantity = Math.min(merged.quantity + quantity, maxAllowedQty(merged));
          merged.addedAt = Date.now();
          newItems[existingIndex] = merged;
          set({ items: newItems, lastUpdated: Date.now() });
        } else {
          // Add new item (stock + maxQuantityPerOrder ...item içinde taşınır)
          const newItem: CartItem = {
            ...item,
            id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quantity: Math.max(1, Math.min(quantity, maxAllowedQty(item))),
            addedAt: Date.now(),
          };
          set({ items: [...items, newItem], lastUpdated: Date.now() });
        }
      },

      addToCart: async (productId: string) => {
        set({ isLoading: true });
        try {
          // This would typically fetch product details from API
          // For now, just add with basic info
          const items = get().items;
          const existingIndex = items.findIndex(i => i.productId === productId);

          if (existingIndex >= 0) {
            const newItems = [...items];
            const it = newItems[existingIndex];
            it.quantity = Math.min(it.quantity + 1, maxAllowedQty(it));
            it.addedAt = Date.now();
            set({ items: newItems, lastUpdated: Date.now(), isLoading: false });
          } else {
            // In real app, fetch product details here
            set({ isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      removeItem: (itemId) => {
        const items = get().items.filter(i => i.id !== itemId);
        set({
          items,
          deselectedIds: pruneDeselected(get().deselectedIds, [itemId]),
          lastUpdated: Date.now(),
        });
      },

      removeByProductId: (productId: string) => {
        const removedIds = get().items.filter(i => i.productId === productId).map(i => i.id);
        const items = get().items.filter(i => i.productId !== productId);
        set({
          items,
          deselectedIds: pruneDeselected(get().deselectedIds, removedIds),
          lastUpdated: Date.now(),
        });
      },

      restoreItem: (item: CartItem, at: { index: number; deselected: boolean }) => {
        const { items, deselectedIds } = get();
        if (items.some((i) => i.productId === item.productId)) return;
        const index = Math.min(Math.max(at.index, 0), items.length);
        set({
          items: [...items.slice(0, index), item, ...items.slice(index)],
          deselectedIds:
            at.deselected && !deselectedIds.includes(item.id) ? [...deselectedIds, item.id] : deselectedIds,
          lastUpdated: Date.now(),
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(itemId);
          return;
        }
        const items = get().items.map(i =>
          i.id === itemId
            ? { ...i, quantity: Math.min(quantity, maxAllowedQty(i)), addedAt: Date.now() }
            : i
        );
        set({ items, lastUpdated: Date.now() });
      },

      clearCart: () => {
        // Boş sepette birleştirilecek bir şey kalmaz (çıkış da buradan geçer).
        set({ items: [], deselectedIds: [], mergePendingFor: null, lastUpdated: Date.now() });
      },

      syncStock: (productId: string, stock: number) => {
        // 0/negatif yazılmaz: `maxAllowedQty` 0'ı "bilinmiyor" sayar ve tavanı 99'a gevşetirdi.
        if (!Number.isFinite(stock) || stock < 1) return;
        const items = get().items;
        if (!items.some((i) => i.productId === productId && i.stock !== stock)) return;
        set({
          items: items.map((i) => (i.productId === productId ? { ...i, stock } : i)),
          lastUpdated: Date.now(),
        });
      },

      // Remove purchased items from cart
      onPurchaseComplete: (productIds: string[]) => {
        const removed = get().items.filter((i) => productIds.includes(i.productId));
        const items = get().items.filter(item => !productIds.includes(item.productId));
        set({
          items,
          // Düşen satırların seçim kaydı da gider; kalanlarınki korunur.
          deselectedIds: pruneDeselected(get().deselectedIds, removed.map((i) => i.id)),
          lastUpdated: Date.now(),
        });
      },

      toggleSelected: (itemId: string) => {
        const cur = get().deselectedIds;
        set({
          deselectedIds: cur.includes(itemId)
            ? cur.filter((id) => id !== itemId)
            : [...cur, itemId],
        });
      },

      setAllSelected: (selected: boolean) => {
        set({ deselectedIds: selected ? [] : get().items.map((i) => i.id) });
      },

      selectedItems: () => {
        const { items, deselectedIds } = get();
        return items.filter((i) => !deselectedIds.includes(i.id));
      },

      isSelected: (itemId: string) => !get().deselectedIds.includes(itemId),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      isInCart: (productId: string) => {
        return get().items.some((item) => item.productId === productId);
      },
    }),
    {
      name: 'tarodan-cart',
      storage: createJSONStorage(() => AsyncStorage),
      // buyNowItem geçicidir; yalnızca sepet kalıcı yazılır.
      partialize: (state) => ({
        items: state.items,
        lastUpdated: state.lastUpdated,
        // Birleştirme bekliyor işareti kalıcı: geçici hatada sonraki açılışta yeniden denenir.
        mergePendingFor: state.mergePendingFor,
      }),
    }
  )
);

export default useCartStore;
