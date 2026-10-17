import { api } from './client';
import { apiPath } from './path';

/** Bir tarafın maliyeti. Hepsi TL ve KDV DAHİL; total = serviceFee + shipping + cashDifference. */
export type TradePaymentQuoteSide = {
  userId?: string;
  side?: 'initiator' | 'receiver';
  serviceFee: number;
  shipping: number;
  cashDifference: number;
  total: number;
  /** Denetim detayı — ekranda BASILMAZ, tek `serviceFee` satırı gösterilir. */
  feeLines?: Array<{ productId: string; role: string; amount: number }>;
};

/**
 * Sunucu ayrıca `commissionRuleSet` ve `ruleMatches[]` döndürüyor (2026-08-09
 * ölçümü — delta 17 §1c'de yazmıyor). İkisi de denetim detayı; istemci OKUMAZ,
 * eksik sanılmasın diye burada anılıyor.
 */
export type TradePaymentQuote = {
  tradeId?: string;
  initiator: TradePaymentQuoteSide;
  receiver: TradePaymentQuoteSide;
};

// Trades API - Web ile aynı endpoint'ler
export const tradesApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/trades', { params }),
  /** Takaslar sekme sayaçları (filtre/sayfalama bağımsız): { all, pending, shipping, completed } */
  getStatusCounts: () =>
    api.get<{ all: number; pending: number; shipping: number; completed: number }>('/trades/status-counts'),
  /** Yanıt bekleyen takas sayısı (rozet) — backend: GET /trades/pending-count */
  getPendingCount: () => api.get<{ count: number }>('/trades/pending-count'),
  getOne: (id: string | number) =>
    api.get(apiPath`/trades/${id}`),
  create: (data: {
    receiverId: string;
    initiatorItems: Array<{ productId: string; quantity: number }>;
    receiverItems: Array<{ productId: string; quantity: number }>;
    cashAmount?: number;
    message?: string;
    shippingAddressId?: string;
  }) => api.post('/trades', data),
  accept: (id: string | number, message?: string, shippingAddressId?: string) =>
    api.post(apiPath`/trades/${id}/accept`, { message, shippingAddressId }),
  reject: (id: string | number, reason?: string) =>
    api.post(apiPath`/trades/${id}/reject`, { reason }),
  cancel: (id: string | number, reason?: string) =>
    api.post(apiPath`/trades/${id}/cancel`, { reason }),
  counter: (id: string | number, data: any) =>
    api.post(apiPath`/trades/${id}/counter`, data),
  ship: (id: string | number, data: { fromAddressId: string; carrier: string }) =>
    api.post(apiPath`/trades/${id}/ship`, data),
  confirmReceipt: (id: string | number) =>
    api.post(apiPath`/trades/${id}/confirm-receipt`),
  raiseDispute: (id: string | number, data: { reason: string; description: string; evidenceUrls?: string[] }) =>
    api.post(apiPath`/trades/${id}/dispute`, data),
  /**
   * Takas ödeme dökümü. v1 takasta `200` + BOŞ GÖVDE döner (ölçümle doğrulandı) —
   * bu hata değildir, `isV2`'nin ikinci kaynağıdır. Takasın HER durumunda çalışır:
   * kabul edilmemiş v2 takasta da dolu gövde döner, bu yüzden 0 satırlı takas v1
   * SAYILAMAZ. `503 server.shipping.noActiveTariff`: aktif tarifede kademe yok.
   */
  getPaymentQuote: (id: string | number) =>
    api.get<Partial<TradePaymentQuote>>(apiPath`/trades/${id}/payment-quote`),
  /**
   * Kaydedilmemiş teklifin canlı fiyatı — teklif oluşturma ekranı için.
   * Yanıtta `tradeId`/`userId`/`side` YOKTUR (ölçümle doğrulandı). Bilinmeyen
   * veya silinmiş `productId` sunucuda sessizce atlanır.
   */
  previewPaymentQuote: (body: {
    initiatorItems: Array<{ productId: string; quantity?: number }>;
    receiverItems: Array<{ productId: string; quantity?: number }>;
    cashAmount?: number;
    cashPayer?: 'initiator' | 'receiver';
  }) => api.post<Omit<TradePaymentQuote, 'tradeId'>>('/trades/payment-quote/preview', body),
};

// Offers API - Web ile aynı endpoint'ler
export const offersApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/offers', { params }),
  getOne: (id: string) =>
    api.get(apiPath`/offers/${id}`),
  /** Bekleyen (gelen) teklif sayısı (rozet) — backend: GET /offers/pending-count */
  getPendingCount: () => api.get<{ count: number }>('/offers/pending-count'),
  create: (data: { productId: string; amount: number; message?: string }) =>
    api.post('/offers', data),
  accept: (id: string) =>
    api.post(apiPath`/offers/${id}/accept`),
  reject: (id: string) =>
    api.post(apiPath`/offers/${id}/reject`),
  counter: (id: string, amount: number) =>
    api.post(apiPath`/offers/${id}/counter`, { amount }),
  /** Alıcının karşı teklifi (satıcının counter'ından sonra). */
  buyerCounter: (id: string, amount: number) =>
    api.post(apiPath`/offers/${id}/buyer-counter`, { amount }),
  cancel: (id: string) =>
    api.post(apiPath`/offers/${id}/cancel`),
};

// Ratings API - Web ile aynı endpoint'ler
export const ratingsApi = {
  // User ratings
  getUserRatings: (userId: string, params?: Record<string, any>) =>
    api.get(apiPath`/ratings/users/${userId}`, { params }),
  getUserStats: (userId: string) =>
    api.get(apiPath`/ratings/users/${userId}/stats`),
  createUserRating: (data: { receiverId: string; orderId?: string; tradeId?: string; score: number; comment?: string }) =>
    api.post('/ratings/users', data),

  // Product ratings
  getProductRatings: (productId: string, params?: Record<string, any>) =>
    api.get(apiPath`/ratings/products/${productId}`, { params }),
  getProductStats: (productId: string) =>
    api.get(apiPath`/ratings/products/${productId}/stats`),
  createProductRating: (data: { productId: string; orderId: string; score: number; title?: string; review?: string; images?: string[] }) =>
    api.post('/ratings/products', data),
  markHelpful: (ratingId: string) =>
    api.post(apiPath`/ratings/products/${ratingId}/helpful`),
};
