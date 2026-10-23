// DTO types of the order detail route.
import type { OrderKind } from '@/types';

export interface OrderDetail {
  id: string;
  orderNumber: string;
  /** Teslimat/paket numarası (`PKG-…`) — kargo oluşunca gelir, eski siparişlerde null. */
  packageNumber?: string | null;
  /**
   * What the order sells (`listing` | `membership` | `boost`). Read through
   * `isDigitalOrder` (`@/types`), never directly: an older API sends no `kind`.
   */
  kind?: OrderKind | null;
  /** `platform_service` on a digital order: the fallback when `kind` is absent. */
  origin?: string | null;
  /** @deprecated True on every digital order; the last fallback of `isDigitalOrder`. */
  isMembership?: boolean | null;
  status: string;
  quantity?: number;
  cancellationType?: 'iptal' | 'iade' | null;
  totalAmount: number;
  shippingCost: number;
  buyerFeeAmount?: number;
  sellerFeeAmount?: number;
  commissionAmount?: number;
  pricing?: {
    subtotal: number;
    shippingAmount: number;
    buyerFeeAmount: number;
    sellerFeeAmount: number;
    commissionAmount: number;
    /** Legacy KDV — sunucu artık hep 0 döndürüyor (2026-07-30 sonrası). */
    taxAmount?: number;
    /** Alıcı hizmet KDV'si — hizmet bedeli + kargo payının %20'si (canlı ölçüm). */
    buyerServiceTaxAmount?: number;
    serviceVatRate?: number;
    totalAmount: number;
    sellerNetAmount: number;
  };
  product: {
    id: string;
    title: string;
    price: number;
    condition: string;
    images?: Array<{ url: string }>;
    imageUrl?: string;
  };
  seller: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    district?: string;
    city: string;
    postalCode?: string;
    zipCode?: string;
  } | null;
  trackingNumber?: string;
  trackingUrl?: string;
  /** Sipariş yanıtındaki kargo özeti; `cargoCode` = `providerTrackingId`. */
  shipment?: {
    cargoCode?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    /** İlk fiziksel devir mührü — doluysa koli taşıyıcıda (hazırlık notu kapısı). */
    shippedAt?: string | null;
  } | null;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  /**
   * Cayma penceresinin teslimde damgalanan sonu — iade hakkı bunu okur.
   * null = damgadan önce teslim edilmiş ya da henüz teslim edilmemiş.
   */
  returnWindowEndsAt?: string | null;
  /** Satıcı ödemesinin (escrow hold) planlanan tarihi; null = hold yok. */
  escrowReleaseAt?: string | null;
  /** Satıcının kargoya verme son tarihi (tek seferlik uzatmada YENİ tarih). */
  preparingDeadline?: string | null;
  /** Doluysa hazırlık süresi bir kez uzatıldı (bir daha uzatılmaz). */
  preparingExtendedAt?: string | null;
  cancelledAt?: string | null;
  /** Sunucunun yazdığı iptal gerekçesi (yönetici iptalinde "Yönetici tarafından iptal edildi: …"). */
  cancelReason?: string | null;
  /** `cancelReason`'ın stabil kategorisi — yalnız `cancelled` siparişte dolu (bkz. `orderCancelMessage`). */
  cancelCategory?: string | null;
  confirmationDeadline?: string;
  buyerConfirmedAt?: string;
  buyerConfirmationType?: string;
  hasProductRating?: boolean;
  hasSellerRating?: boolean;
  isBuyer?: boolean;
  isSeller?: boolean;
  payment?: { status?: string } | null;
  activeRefundRequest?: {
    id: string;
    refundNumber?: string;
    status: string;
    reason?: string;
    createdAt: string;
    refundedAt?: string | null;
    returnTrackingNumber?: string | null;
    returnProvider?: string | null;
  } | null;
  [key: string]: any;
}

/** Ekranın snackbar'ına mesaj basan geri çağırım (`useOrderActions.notify`). */
export type Notify = (message: string, variant: 'success' | 'danger' | 'default') => void;
