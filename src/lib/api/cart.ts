import { api } from "./client";
import { apiPath } from "./path";

/** Sunucu sepetindeki tek satır (CartItemResponseDto). */
export interface ServerCartItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  originalPrice: number;
  salePrice?: number;
  /** salePrice varsa o, yoksa originalPrice. */
  effectivePrice: number;
  lineTotal: number;
  productDiscount?: number;
  isAvailable: boolean;
  /** Sunucunun yerelleştirilmiş stok uyarısı ("Son 1 ürün", "Stokta yok" …) — olduğu gibi gösterilir. */
  stockWarning?: string;
  /** Bu satırda sipariş edilebilecek azami adet; tanımsız = sınırsız stok. */
  maxQuantity?: number;
  /** Ürünün şu anki satın alınabilir stoğu (yeni sunucu; eski yanıtta yok). */
  availableQuantity?: number;
}

/** Sepet fiyat hesabı (CartCalculationResponseDto). */
export interface ServerCartCalculation {
  items: ServerCartItem[];
  itemCount: number;
  subtotal: number;
  productDiscountTotal: number;
  couponDiscountTotal: number;
  campaignDiscountTotal: number;
  totalDiscount: number;
  shippingCost: number;
  amountToFreeShipping: number;
  grandTotal: number;
  appliedCouponCode?: string;
  warnings: string[];
}

export interface ServerCart {
  id: string;
  userId: string;
  couponCode?: string;
  expiresAt: string;
  calculation: ServerCartCalculation;
}

/**
 * Sunucu sepeti — TÜM uçlar bearer ister, misafirin sunucu sepeti yoktur.
 * Misafir sepeti cihazdaki zustand store'da kalır (bkz. stores/cartStore).
 *
 * Kupon uçları (POST/DELETE /cart/coupon) bilinçli olarak eklenmedi: kupon
 * checkout'ta `couponCode` ile uygulanıyor, ikinci bir yol akışı bölerdi.
 */
export const cartApi = {
  /** Sepet + fiyat hesabı (stok uyarıları burada gelir). */
  get: () => api.get<ServerCart>("/cart"),

  addItem: (productId: string, quantity = 1) =>
    api.post<ServerCart>("/cart/items", { productId, quantity }),

  /** quantity: 0 → satırı kaldırır (backend sözleşmesi). */
  updateItem: (productId: string, quantity: number) =>
    api.patch<ServerCart>(apiPath`/cart/items/${productId}`, { quantity }),

  removeItem: (productId: string) =>
    api.delete<ServerCart>(apiPath`/cart/items/${productId}`),

  clear: () => api.delete("/cart"),
};
