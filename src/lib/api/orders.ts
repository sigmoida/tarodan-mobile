import { api, guestApi } from './client';

// Orders API - Web ile aynı endpoint'ler
export type OrderAddressInput = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  zipCode?: string;
};

/**
 * `POST /orders/quote` yanıtı (2026-07-30 canlı ölçüm — staging).
 * `pricingHash` + `shippingTariffVersion` KÖKTE, `pricing` içinde DEĞİL — order-create
 * uçlarının `expectedPricingHash`/`expectedShippingTariffVersion` zorunlu alanları
 * buradan gelir. `pricing.summary` ekranda basılacak TEK doğru kırılım (§CLAUDE.md
 * "parayla ilgili hiçbir değeri istemcide hesaplama").
 */
export type OrderQuotePricingSummary = {
  /** Kupon sonrası ürün ara toplamı — kuponu ekranda bir daha düşme. */
  productAmount: number;
  shippingAmount: number;
  /** Hizmet bedeli + TÜM alıcı hizmet KDV'si — ayrı bir KDV satırı ekleme. */
  serviceFeeAmount: number;
  total: number;
};

export type OrderQuotePricing = {
  subtotal?: number;
  shippingAmount?: number;
  buyerFeeAmount?: number;
  buyerFeeRate?: number;
  sellerFeeAmount?: number;
  commissionAmount?: number;
  taxAmount?: number;
  buyerServiceTaxAmount?: number;
  sellerServiceTaxAmount?: number;
  serviceVatRate?: number;
  totalAmount?: number;
  sellerNetAmount?: number;
  summary?: OrderQuotePricingSummary;
};

/**
 * Quote'un SATIR kırılımı (canlı ölçüm — staging, 2026-08-02).
 * `subtotal` adedi ZATEN içerir (quantity: 3 → subtotal = 3 × unitPrice), bu yüzden
 * ekranda satır tutarı için istemcide `price × quantity` çarpımı YAPILMAZ; sepet
 * satırındaki `price` sepete ekleme anında donmuş 24 saatlik bir kopyadır ve
 * kampanya penceresi kapanınca sunucu tutarından sessizce ayrışır.
 */
export type OrderQuoteItem = {
  productId: string;
  sellerId?: string;
  quantity?: number;
  /** Sunucunun O AN geçerli birim fiyatı (kampanya dahil). */
  unitPrice?: number;
  /** Satırın adet DAHİL tutarı — ekranda basılacak TEK doğru satır tutarı. */
  subtotal?: number;
  buyerFeeAmount?: number;
  sellerFeeAmount?: number;
  sellerNetAmount?: number;
  taxAmount?: number;
  title?: string;
};

/**
 * Quote'un fiyatlayamadığı satırlar (delta 18 §1). Quote 200 ile KISMİ başarı
 * dönebilir: `items[]` yalnız fiyatlananlar, bunlar dışarıda bırakılanlardır.
 */
export type QuoteUnavailableItem = {
  productId: string;
  sellerId?: string;
  /** PRODUCT_NOT_FOUND | PRODUCT_NOT_ACTIVE | SELLER_SALES_SUSPENDED — kapalı liste DEĞİL. */
  code: string;
  message: string;
};

export type OrderQuoteShippingBySeller = {
  sellerId: string;
  shippingCost: number;
  sellerShippingCost?: number;
  billableDesi?: number;
  packageTier?: string;
};

export type OrderQuoteResponse = {
  itemsSubtotal?: number;
  shippingAmount?: number;
  buyerFeeAmount?: number;
  sellerFeeAmount?: number;
  commissionAmount?: number;
  taxAmount?: number;
  couponDiscount?: number;
  totalAmount?: number;
  sellerNetAmount?: number;
  items?: OrderQuoteItem[];
  shippingBySeller?: OrderQuoteShippingBySeller[];
  /** Order-create payload'ına AYNEN geri gönderilecek fiyat imzası. */
  pricingHash: string;
  /** Order-create payload'ına AYNEN geri gönderilecek kargo tarife versiyonu. */
  shippingTariffVersion: number;
  /** Order-create payload'ına AYNEN geri gönderilecek komisyon seti (delta 18). */
  commissionRuleSetId: string;
  commissionRuleSetVersion: number;
  pricing?: OrderQuotePricing;
  /** Fiyatlanamayan satırlar (delta 18 §1) — her zaman gelir, yoksa `[]`. */
  unavailableItems?: QuoteUnavailableItem[];
};

/**
 * Sipariş gövdesine AYNEN geri gidecek fiyat imzası. Delta 18 ile komisyon
 * rule-set kimliği/sürümü eklendi; alanlar dört payload üreticisine dağıtılmak
 * yerine burada toplanır — beşinci alan geldiğinde yalnız bu tip ve
 * `toExpectedPricing` değişir, çağıran hiç değişmez.
 */
export type ExpectedPricingSnapshot = {
  expectedPricingHash: string;
  expectedShippingTariffVersion: number;
  expectedCommissionRuleSetId: string;
  expectedCommissionRuleSetVersion: number;
};

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/**
 * Quote → imza. Alanlardan biri eksik/tip dışıysa `null`: yarım gövde göndermek
 * yalnız aynı 400'ü başka bir şekilde üretir, çağıran bunu "fiyat hazır değil"
 * kapısı olarak kullanır.
 */
export function toExpectedPricing(
  q: OrderQuoteResponse | undefined | null,
): ExpectedPricingSnapshot | null {
  if (!q) return null;
  if (typeof q.pricingHash !== 'string' || !q.pricingHash) return null;
  if (!isFiniteNumber(q.shippingTariffVersion)) return null;
  if (typeof q.commissionRuleSetId !== 'string' || !q.commissionRuleSetId) return null;
  if (!isFiniteNumber(q.commissionRuleSetVersion)) return null;
  return {
    expectedPricingHash: q.pricingHash,
    expectedShippingTariffVersion: q.shippingTariffVersion,
    expectedCommissionRuleSetId: q.commissionRuleSetId,
    expectedCommissionRuleSetVersion: q.commissionRuleSetVersion,
  };
}

export const ordersApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/orders', { params }),
  /** Satıcı kazanç özeti (filtre/sayfalama bağımsız): { totalEarnings, pendingEarnings } */
  getSellerEarnings: () =>
    api.get<{ totalEarnings: number; pendingEarnings: number }>('/orders/seller/earnings'),
  getOne: (id: string | number) =>
    api.get(`/orders/${id}`),
  create: (data: any) =>
    api.post('/orders', data),
  /** Buy Now — üye için doğrudan satın alma */
  directBuy: ({ expectedPricing, ...rest }: {
    productId: string;
    shippingAddressId?: string;
    shippingAddress?: OrderAddressInput;
    billingAddressId?: string;
    billingAddress?: OrderAddressInput;
    /** Quote'tan türetilmiş fiyat imzası — gövdeye düz alanlar olarak yayılır. */
    expectedPricing: ExpectedPricingSnapshot;
  }) => api.post('/orders/buy', { ...rest, ...expectedPricing }),
  createGuest: ({ expectedPricing, ...rest }: {
    productId: string;
    email: string;
    phone: string;
    guestName: string;
    shippingAddress: OrderAddressInput;
    billingAddress?: OrderAddressInput;
    offerId?: string;
    price?: number;
    /** Quote'tan türetilmiş fiyat imzası — gövdeye düz alanlar olarak yayılır. */
    expectedPricing: ExpectedPricingSnapshot;
  }) => guestApi.post('/orders/guest', { ...rest, ...expectedPricing }),
  sendGuestVerificationCode: (data: { email: string; expectedCheckoutCount?: number }) =>
    guestApi.post<{ success: boolean; expiresInSeconds: number }>(
      '/orders/guest/send-verification-code',
      data,
    ),
  /** Toplu checkout (üye): sepetteki tüm ürünler tek CheckoutGroup altında, tek ödeme */
  checkout: ({ expectedPricing, ...rest }: {
    items: Array<{ productId: string }>;
    idempotencyKey: string;
    shippingAddressId?: string;
    shippingAddress?: OrderAddressInput;
    billingAddressId?: string;
    billingAddress?: OrderAddressInput;
    couponCode?: string;
    /** Quote'tan türetilmiş fiyat imzası — gövdeye düz alanlar olarak yayılır. */
    expectedPricing: ExpectedPricingSnapshot;
  }) => api.post('/orders/checkout', { ...rest, ...expectedPricing }),
  /** Toplu checkout (misafir) */
  checkoutGuest: ({ expectedPricing, ...rest }: {
    items: Array<{ productId: string }>;
    idempotencyKey: string;
    email: string;
    emailVerificationCode: string;
    phone: string;
    guestName: string;
    shippingAddress: OrderAddressInput;
    billingAddress?: OrderAddressInput;
    /** GuestCheckoutGroupDto, CheckoutDto'yu extends eder → kupon misafirde de geçerli. */
    couponCode?: string;
    /** Quote'tan türetilmiş fiyat imzası — gövdeye düz alanlar olarak yayılır. */
    expectedPricing: ExpectedPricingSnapshot;
  }) => guestApi.post('/orders/checkout/guest', { ...rest, ...expectedPricing }),
  /** Alıcının sipariş grupları (gruplu liste) */
  getGroups: (params?: Record<string, any>) =>
    api.get('/orders/groups', { params }),
  /** Tek sipariş grubu detayı (ürün satırları + ayrı kargolar) */
  getGroup: (id: string) =>
    api.get(`/orders/groups/${id}`),
  cancel: (id: string | number, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  /** Alıcı: teslim aldım onayı (backend: POST /orders/:id/confirm). */
  confirm: (id: string | number) =>
    api.post(`/orders/${id}/confirm`),
  /** Alıcı: 48h pencerede erken onay (backend: POST /orders/:id/confirm-receipt) (Faz 4C). */
  confirmReceipt: (id: string | number) =>
    api.post(`/orders/${id}/confirm-receipt`),
  /** Satıcı: siparişi hazırlanıyor olarak işaretle (backend: POST /orders/:id/prepare) */
  markAsPreparing: (id: string | number) =>
    api.post(`/orders/${id}/prepare`),
  /** İptal edilmiş teklif siparişini yeniden aç (backend: POST /orders/:id/reactivate) */
  reactivate: (id: string | number) =>
    api.post(`/orders/${id}/reactivate`),
  /** Satıcı tarafında kargo adresi/bilgisi güncelleme */
  setShippingAddress: (id: string | number, data: OrderAddressInput) =>
    api.patch(`/orders/${id}/shipping-address`, data),
  /** Guest sipariş takibi (orderNumber + email) */
  trackGuest: (data: { orderNumber: string; email: string }) =>
    guestApi.post('/orders/guest/track', data),
  /* `GET /orders/:id/my-review` bilerek YOK: değerlendirme durumunun kaynağı
     sipariş gövdesindeki `hasProductRating` / `hasSellerRating` (ikisi de
     sunucudan gelir ve `OrderRatingButtons` onları okur). Ayrı bir uç, aynı
     gerçeğin ikinci kaynağı olurdu — tanımlıydı, hiç çağrılmıyordu. */
  /**
   * Checkout quote (fiyat kırılımı) — `pricingHash`/`shippingTariffVersion` köktedir.
   * `couponCode` yalnızca DOĞRULANMIŞ bir kupon varken gönderilir: sunucu indirimi
   * quote'a da uygular (fee/tax/shipping indirimli tabana göre yeniden hesaplanır),
   * aksi halde önizleme toplamı checkout'ta gerçekte tahsil edilenden fazla görünür
   * (canlı ölçüm — geçersiz kod 400 "Kupon kodu bulunamadı", boş/null/eksik 201).
   */
  getQuote: (data: { items: Array<{ productId: string; quantity?: number }>; couponCode?: string }) =>
    api.post<OrderQuoteResponse>('/orders/quote', data),
  /**
   * İlan formunda komisyon önizleme (tek ürün).
   *
   * `packageTier` gönderilmezse sunucu `small` VARSAYAR — yani satıcıya her
   * zaman en küçük paketin net kazancı gösterilirdi. Seçim yapılmışsa aynen
   * geçir; yapılmamışsa alanı hiç koyma (istemci `small` uydurmaz).
   */
  getCommissionPreview: (params: {
    amount: number;
    categoryId?: string;
    packageTier?: ShippingPackageTierCode;
  }) => api.get('/orders/commission-preview', { params }),
  /** İlanlarım listesi için toplu komisyon önizleme */
  getCommissionPreviewBatch: (items: Array<{ amount: number; categoryId?: string | null }>) =>
    api.post('/orders/commission-preview-batch', { items }),
};

// eLogo e-Arşiv (gerçek yasal fatura) API
export const elogoInvoicesApi = {
  /** Siparişe ait kullanıcının e-Arşiv faturası (yoksa null) — buton hazırsa çıksın */
  byOrder: (orderId: string) =>
    api.get<{ id: string; invoiceNumber: string; label?: string; total?: number } | null>(
      `/elogo/invoices/by-order/${orderId}`,
    ),
  /** Fatura PDF — S3 presigned URL döner ({ url }) */
  pdf: (id: string) => api.get<{ url?: string; invoiceNumber?: string }>(`/elogo/invoices/${id}/pdf`),
};

// Kurumsal satıcının siparişe ELLE yüklediği ürün faturası (eLogo gelir faturasından ayrı)
export const sellerInvoiceApi = {
  /** Durum: yüklenmiş fatura + geçerli kullanıcının yükleme yetkisi */
  status: (orderId: string) =>
    api.get<{
      invoice: { id: string; fileName: string; uploadedAt: string } | null;
      canUpload: boolean;
      isSeller: boolean;
      isBuyer: boolean;
    }>(`/orders/${orderId}/seller-invoice`),
  /** Kurumsal satıcı: siparişe fatura PDF yükle/değiştir (alıcıya mail gider).
   *  Backend: POST /orders/:id/seller-invoice — multipart/form-data, alan adı `file`. */
  upload: (orderId: string, file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', file as any);
    return api.post(`/orders/${orderId}/seller-invoice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /** İndirme — S3 presigned URL ({ url, fileName }) */
  download: (orderId: string) =>
    api.get<{ url?: string; fileName?: string }>(`/orders/${orderId}/seller-invoice/download`),
};

// Shipping API — Backend `/shipping`
// Tek kargo firması: Sürat Kargo (backend enum'u diğer değerleri hala içerse de
// uygulama yalnızca 'surat' ile çalışıyor — web ile parite).
export type ShippingProvider = 'surat';

/**
 * Kargo ÜCRETİ sorgulayan uçlar (`GET/POST /shipping/rates`, `/shipping/carriers`)
 * bilerek YOK: checkout'ta gösterilen kargo tutarı yalnızca `POST /orders/quote`
 * yanıtından gelir (`pricing.summary.shippingAmount`). Ayrı bir tarife çağrısı,
 * ekrandaki tutarın PayTR'de çekilenden sessizce ayrışmasına yol açıyordu; yüzeyi
 * yeniden eklemek o hatayı da geri getirir. Buradaki uçlar yalnız kargo
 * OPERASYONU (shipment oluşturma / takip) içindir.
 */
/** İlan başına seçilen kargo paket boyutu (desi girdisinin yerine geçti). */
export type ShippingPackageTierCode = 'small' | 'medium' | 'large';

/**
 * `GET /shipping/package-tiers` kademesi (canlı ölçüm — staging, 2026-08-02).
 *
 * ⚠️ `billableDesi` / `minDesi` / `maxDesi` **asla render edilmez** (doküman 14
 * §1 bağlayıcı kuralı: mobil arayüzde desi hiç görünmez). Bunlar yalnız
 * sunucunun paket kademesini `Σ billableDesi × adet`'ten türetmesi için var.
 *
 * `sample*` ölçüleri bugün üç kademede de `null` — "varsa göster".
 */
export interface ShippingPackageTier {
  code: ShippingPackageTierCode;
  label: string;
  /** Kademenin TAM kargo bedeli. Alıcı/satıcı payı kategori bazlı ve admin
   *  tarafından belirleniyor (canlıda 50/50) — istemci pay HESAPLAMAZ. */
  amount: number;
  billableDesi: number;
  minDesi: number | null;
  maxDesi: number | null;
  sampleWidth: number | null;
  sampleHeight: number | null;
  sampleLength: number | null;
}

export interface ShippingPackageTiersResponse {
  tariffVersion: number;
  tiers: ShippingPackageTier[];
}

/**
 * `GET /shipping/order/:orderId` yanıtı (2026-08-10 ölçümü — TEK nesne, dizi değil).
 *
 * İKİ numara taşır ve işleri farklıdır:
 *   - `trackingNumber` (`PKG-…`/`ORD-…`): Tarodan iç referansı; satıcı şubede verir.
 *   - `providerTrackingId`: gerçek Sürat kodu; takip bununla yapılır, şube
 *     kabulünden SONRA dolar.
 *
 * `trackingUrl` tipte var ama OKUNMAZ — ölçümde ya `null` ya da iç referansı
 * taşıyan bozuk bir link. Bkz. `src/lib/shipping/tracking.ts`.
 */
export type Shipment = {
  id: string;
  orderId: string;
  provider: string;
  trackingNumber: string | null;
  providerTrackingId: string | null;
  trackingUrl: string | null;
  status: string;
  cost?: number | null;
  estimatedDelivery?: string | null;
  events?: unknown[];
};

export const shippingApi = {
  /**
   * Kargo paket kademesi tarifesi (public). İlan formundaki üç kartın kaynağı.
   * Tarife tanımlı değilse backend 503 döner — çağıran fail-closed davranmalı
   * (kademe seçtirmeden ilan gönderilmesin).
   */
  getPackageTiers: () =>
    api.get<ShippingPackageTiersResponse>('/shipping/package-tiers'),
  /** Sipariş için kargo başlat — backend: POST /shipping */
  createShipment: (data: { orderId: string; provider: ShippingProvider }) =>
    api.post('/shipping', data),
  /** Kargo takip numarası gir — backend: PATCH /shipping/:id/tracking */
  updateTracking: (shipmentId: string, data: { trackingNumber: string }) =>
    api.patch(`/shipping/${shipmentId}/tracking`, data),
  /** Tek shipment detayı */
  getShipment: (id: string) => api.get(`/shipping/${id}`),
  /** Siparişin shipment'ları */
  getOrderShipments: (orderId: string) => api.get(`/shipping/order/${orderId}`),
};

/**
 * Buyer + seller refund request endpoints (web ile parite).
 * Backend module: apps/api/src/modules/refund (RefundController).
 * Reasons (Prisma enum RefundReason): changed_mind | damaged | wrong_item |
 * not_as_described | missing_parts | other.
 */
export const refundsApi = {
  /** POST /orders/:orderId/refund-requests
   * refundQuantity: adet bazlı kısmi iade (verilmezse siparişin tüm adedi iade edilir). */
  create: (
    orderId: string,
    body: {
      reason: string;
      description?: string;
      evidencePhotoUrls?: string[];
      refundQuantity?: number;
    },
  ) => api.post(`/orders/${orderId}/refund-requests`, body),
  /** GET /refund-requests/:id */
  getById: (id: string) => api.get(`/refund-requests/${id}`),
  /** GET /refund-requests/me — buyer's own refund requests */
  getMine: () => api.get('/refund-requests/me'),
  /** GET /refund-requests/seller — seller'a gelen iade talepleri */
  getSeller: () => api.get('/refund-requests/seller'),
  /** POST /refund-requests/:id/cancel */
  cancel: (id: string) => api.post(`/refund-requests/${id}/cancel`),
};
