export interface Sale {
  id: string;
  orderNumber: string;
  // Backend ham OrderStatus enum'u; sadece preparing→processing normalize edilir.
  status: string;
  // Kargo öncesi iptalde status 'refunded' olur ama bu 'iptal' der → rozet/filtre
  // "İptal Edildi" göstersin (alıcı orders/index ile tutarlı).
  cancellationType?: string | null;
  totalAmount: number;
  /**
   * Sunucunun kırılımı. `subtotal` SATICININ ürün bedeli; `totalAmount` alıcının
   * ödediği toplam (kargo + alıcı hizmet bedeli + KDV) ve satıcı ekranında
   * yanıltıcı. Satış detayı da bu kırılımı okuyor.
   */
  pricing?: { subtotal?: number; sellerNetAmount?: number };
  product: {
    id: string;
    title: string;
    images?: Array<{ url: string }>;
    imageUrl?: string | null;
  };
  buyer: {
    id: string;
    displayName: string;
  };
  // Adressiz satış olabilir (örn. eski/eksik kayıt) → opsiyonel, render korumalı.
  shippingAddress?: {
    fullName: string;
    address: string;
    city: string;
  } | null;
  createdAt: string;
}

export type FilterType = 'all' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';
