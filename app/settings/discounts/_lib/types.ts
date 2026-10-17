import type { MessageKey } from '@/i18n/lib';

import type { DiscountType } from '@/lib/api';
import { formatPrice } from '@/utils/format';

export type { DiscountType };
export type DiscountScope = 'seller' | 'product';

export interface Discount {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: DiscountType;
  value: number;
  /** Adet koşullu kampanyalar (bogo/bulk_quantity) — sepette kendiliğinden uygulanır. */
  minQuantity?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  scope: DiscountScope;
  targetProductIds: string[];
  minCartValue: number | null;
  maxDiscountAmount: number | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  isStackable: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  isCurrentlyValid: boolean;
}

export interface MyProduct {
  id: string;
  title: string;
  price: number;
  status?: string;
}

/** İndirim formu rotaları (liste → yeni / düzenle → ürün seçici; düz stack push). */
export const discountRoutes = {
  new: '/settings/discounts/new',
  edit: (id: string) => `/settings/discounts/${id}/edit`,
  products: '/settings/discounts/products',
} as const;

// Etiketler `labelKey` olarak duruyor; modül seviyesinde `t()` çağırmak metni
// ilk yüklenen dilde dondururdu (aynı gerekçe my-listings/_lib/types.ts'teki
// `statusTextKey`'de de var). Ekran `t(opt.labelKey)` ile çözer.
export const FILTERS: Array<{ value: '' | 'active' | 'inactive' | 'expired'; labelKey: MessageKey }> = [
  { value: '', labelKey: 'common.all' },
  { value: 'active', labelKey: 'discount.active' },
  { value: 'inactive', labelKey: 'common.inactive' },
  { value: 'expired', labelKey: 'discount.filterExpired' },
];

// İndirim kartı sunum yardımcıları.
export const formatDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');

export const isQuantityType = (type: DiscountType) => type === 'bogo' || type === 'bulk_quantity';

export const valueLabel = (d: Discount) => {
  if (d.type === 'bogo') return `${d.buyQuantity ?? '?'}+${d.getQuantity ?? '?'}`;
  return d.type === 'fixed_amount' ? formatPrice(d.value) : `%${d.value}`;
};

/** Adet koşullu kampanyanın kart özeti; diğer türlerde `null`. */
export function quantitySummary(
  d: Discount,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string | null {
  if (d.type === 'bogo' && d.buyQuantity && d.getQuantity) {
    return t('discount.bogoSummary', { buy: d.buyQuantity, get: d.getQuantity });
  }
  if (d.type === 'bulk_quantity' && d.minQuantity) {
    return t('discount.bulkSummary', { min: d.minQuantity, value: d.value });
  }
  return null;
}
