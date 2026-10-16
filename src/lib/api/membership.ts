import { api, guestApi } from './client';
import { apiPath } from './path';
import type { PaymentPurpose } from '@/lib/payment/capabilities';

/** `GET /membership/cards` satırı (maskeli; PAN/CVV yok). */
export interface SavedCard {
  id: string;
  last4: string;
  brand: string | null;
  bank?: string | null;
  cardType?: string | null;
  cardScheme?: string | null;
  businessCard?: boolean | null;
  expMonth: string | null;
  expYear: string | null;
  requireCvv: boolean;
  isDefault: boolean;
  /** Yalnız üyelik mağazasındaki CVV istemeyen kartta `true` (API delta 20). */
  autoRenewEligible: boolean;
  /** Kartın saklandığı PayTR mağazası. Eski API döndürmeyebilir. */
  purpose?: PaymentPurpose;
}

// Membership API - Web ile aynı endpoint'ler
export const membershipApi = {
  getTiers: () => api.get('/membership/tiers'),
  getCurrentMembership: () => api.get('/membership/me'),
  /** Kullanıcının üyelik limitleri (maxListings, canTrade vs.) */
  getLimits: () => api.get('/membership/me/limits'),
  /**
   * Üyelik satın alma. Web: subscribe({ tierType, billingPeriod }).
   * Geriye uyum: tierId ilk parametre olarak da desteklenir.
   */
  subscribe: (
    tierOrData: string | { tierType: string; billingPeriod: 'monthly' | 'yearly' },
    billingCycleArg?: 'monthly' | 'yearly',
  ) => {
    if (typeof tierOrData === 'string') {
      return api.post('/membership/subscribe', {
        tierType: tierOrData,
        billingPeriod: billingCycleArg || 'monthly',
      });
    }
    return api.post('/membership/subscribe', tierOrData);
  },
  cancel: () => api.post('/membership/cancel'),
  /** Dönem sonuna planlanmış paket değişikliğini iptal et — POST /membership/cancel-scheduled-change */
  cancelScheduledChange: () => api.post('/membership/cancel-scheduled-change'),
  /** Otomatik yenilemeyi aç/kapa — backend: PATCH /membership/auto-renew */
  setAutoRenew: (autoRenew: boolean) =>
    api.patch('/membership/auto-renew', { autoRenew }),
  /**
   * Kayıtlı kartları listele (maskeli; PAN/CVV içermez) — GET /membership/cards.
   *
   * Ödeme ekranı `purpose` VERMELİ: kartlar PayTR mağazasına özeldir, diğer
   * mağazanın kartıyla direct-form `404 server.payment.savedCardNotFound` döner.
   * Amaçsız çağrı (kart yönetimi ekranı) tüm aktif kartları döndürür.
   */
  listCards: (purpose?: PaymentPurpose) =>
    api.get<SavedCard[]>('/membership/cards', purpose ? { params: { purpose } } : undefined),
  /** Kayıtlı kartı sil (PayTR'dan da silinir) — DELETE /membership/cards/:id */
  deleteCard: (id: string) => api.delete(apiPath`/membership/cards/${id}`),
  /** Üyelik ödemesini başlat — backend: POST /membership/payments/initiate */
  initiatePayment: (data: { tierType: string; billingPeriod: 'monthly' | 'yearly'; provider?: 'paytr' }) =>
    api.post('/membership/payments/initiate', data),
  /** İlan oluşturma sınırı kontrol — GET /membership/check/listing */
  checkListingLimit: () => api.get('/membership/check/listing'),
  /** Takas özelliği erişimi — GET /membership/check/trade */
  checkTradeAccess: () => api.get('/membership/check/trade'),
  /** Koleksiyon özelliği erişimi — GET /membership/check/collection */
  checkCollectionAccess: () => api.get('/membership/check/collection'),
};

/** İndirim / kupon / kampanya */
/** API `DiscountType`: yüzde / sabit tutar + adet koşullu kampanyalar (bogo, bulk_quantity). */
export type DiscountType = 'percentage' | 'fixed_amount' | 'bogo' | 'bulk_quantity';
export type DiscountScope = 'global' | 'category' | 'product' | 'seller';

/**
 * `POST /discounts` gövdesi (API `CreateDiscountDto`). Adet koşullu türler kodsuz-otomatiktir:
 * - `bogo`: `buyQuantity` al, `getQuantity` bedava (`value` 0),
 * - `bulk_quantity`: en az `minQuantity` adet, `value` yüzde.
 */
export interface CreateDiscountPayload {
  code?: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  categoryId?: string;
  targetProductIds?: string[];
  minCartValue?: number;
  maxDiscountAmount?: number;
  /** `bulk_quantity`: kampanyanın başladığı en az adet (>= 1; form >= 2 ister). */
  minQuantity?: number;
  /** `bogo`: kaç tane alınca (Buy X). */
  buyQuantity?: number;
  /** `bogo`: kaç tane bedava (Get Y). */
  getQuantity?: number;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  isStackable?: boolean;
  priority?: number;
  isActive?: boolean;
  startDate: string;
  endDate: string;
}

/**
 * `PATCH /discounts/:id` gövdesi (API `UpdateDiscountDto` = kısmi). Temizlenen isteğe
 * bağlı alan `null` gider: `undefined` JSON'dan düşer ve sunucu eski değeri korurdu.
 */
export type UpdateDiscountPayload = {
  [K in keyof CreateDiscountPayload]?: CreateDiscountPayload[K] | null;
};

export const discountsApi = {
  getAll: (params?: Record<string, any>) => api.get('/discounts', { params }),
  getOne: (id: string) => api.get(apiPath`/discounts/${id}`),
  create: (data: CreateDiscountPayload) => api.post('/discounts', data),
  update: (id: string, data: UpdateDiscountPayload) =>
    api.patch(apiPath`/discounts/${id}`, data),
  delete: (id: string) => api.delete(apiPath`/discounts/${id}`),
  validate: (data: {
    code: string;
    cartItems: Array<{ productId: string; quantity: number; price: number }>;
  }) => api.post('/discounts/validate', data),
  /** Misafir sepeti için kupon doğrulama (auth yok) — POST /discounts/validate-guest */
  validateGuest: (data: {
    code: string;
    cartItems: Array<{ productId: string; quantity: number }>;
  }) => guestApi.post('/discounts/validate-guest', data),
  getActiveCampaigns: () => api.get('/discounts/active'),
};
