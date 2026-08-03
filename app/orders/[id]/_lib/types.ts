// Sipariş detay route'unun DTO tipleri.

export interface OrderDetail {
  id: string;
  orderNumber: string;
  /** Teslimat/paket numarası (`PKG-…`) — kargo oluşunca gelir, eski siparişlerde null. */
  packageNumber?: string | null;
  isMembership?: boolean;
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
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string | null;
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
