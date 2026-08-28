import type { UiOrderStatus } from '@/utils/orderStatus';

export interface GroupOrder {
  id: string;
  orderNumber: string;
  status: UiOrderStatus;
  totalAmount: number;
  product: {
    id: string;
    title: string;
    images?: Array<{ url: string }>;
    imageUrl?: string;
  };
  seller: { id: string; displayName: string };
  /** Tarodan iç referansı (`PKG-…`) — satıcı şubede verir, ALICIYA GÖSTERİLMEZ. */
  trackingNumber?: string | null;
  /** Gerçek Sürat kodu (= `providerTrackingId`); takip bununla yapılır. */
  cargoCode?: string | null;
  /** Sunucudan gelir ama OKUNMAZ — link `buildTrackingUrl` ile kurulur. */
  trackingUrl?: string | null;
  cancellationType?: 'iptal' | 'iade' | null;
  activeRefundRequest?: { id: string; status: string } | null;
  shipment?: {
    provider?: string;
    trackingNumber?: string | null;
    cargoCode?: string | null;
    status?: string;
  } | null;
}

/**
 * Satıcı-bazlı paket kırılımı (`GET /orders/groups/:id`'nin `packages[]`'ı).
 * Çok satıcılı bir sepette her satıcı kendi kolisiyle, kendi kargo ücretiyle
 * ve kendi Sürat gönderisiyle gönderilir — `orders[]` bunu satır bazında hiç
 * taşımaz (bkz. B10 parite bulgusu).
 */
export interface GroupPackage {
  id: string;
  packageNumber: string | null;
  sellerId: string | null;
  seller: {
    id: string;
    publicName?: string;
    displayName: string;
  } | null;
  shippingCost: number;
  cargo: {
    trackingNumber: string | null;
    /** Gerçek Sürat kodu — `deriveShipmentView`'e fallback olarak verilir. */
    cargoCode: string | null;
    provider: string | null;
    status: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
  } | null;
}

export interface GroupDetail {
  id: string;
  groupNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  payment?: { status: string; amount: number } | null;
  orders: GroupOrder[];
  packages: GroupPackage[];
}
