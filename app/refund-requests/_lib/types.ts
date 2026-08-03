// İade talebi listesinin route-local DTO'su.

export interface RefundRequestRow {
  id: string;
  status: string;
  reason: string;
  /** Satıcı sekmesinde talebi AÇAN kullanıcı (alıcı sekmesinde gelmez). */
  requester?: { id: string; displayName?: string };
  amount?: number;
  description?: string;
  createdAt?: string;
  order?: { orderId?: string; orderNumber?: string; product?: { title?: string; images?: string[] }; seller?: { displayName?: string } };
}

/** Hangi liste gösteriliyor: kendi taleplerim mi, bana açılanlar mı. */
export type RefundTab = 'buyer' | 'seller';
