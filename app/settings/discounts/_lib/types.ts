import type { MessageKey } from '@/i18n/lib';

export type DiscountType = 'percentage' | 'fixed_amount' | 'bogo' | 'bulk_quantity';
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

// Etiketler `labelKey` olarak duruyor; modül seviyesinde `t()` çağırmak metni
// ilk yüklenen dilde dondururdu (aynı gerekçe my-listings/_lib/types.ts'teki
// `statusTextKey`'de de var). Ekran `t(opt.labelKey)` ile çözer.
export const FILTERS: Array<{ value: '' | 'active' | 'inactive' | 'expired'; labelKey: MessageKey }> = [
  { value: '', labelKey: 'common.all' },
  { value: 'active', labelKey: 'discount.active' },
  { value: 'inactive', labelKey: 'common.inactive' },
  { value: 'expired', labelKey: 'discount.filterExpired' },
];

export const initialForm = () => ({
  id: '' as string | undefined,
  code: '',
  name: '',
  description: '',
  type: 'percentage' as DiscountType,
  value: '10',
  // bogo: "X al" / "Y bedava"; bulk_quantity: en az adet. Input'tan geldiği için string.
  buyQuantity: '',
  getQuantity: '',
  minQuantity: '',
  scope: 'seller' as DiscountScope,
  targetProductIds: [] as string[],
  minCartValue: '',
  maxDiscountAmount: '',
  usageLimitTotal: '',
  usageLimitPerUser: '1',
  isStackable: false,
  isActive: true,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
});

export type DiscountForm = ReturnType<typeof initialForm>;

// İndirim kartı sunum yardımcıları.
export const formatDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');

export const isQuantityType = (type: DiscountType) => type === 'bogo' || type === 'bulk_quantity';

export const valueLabel = (d: Discount) => {
  if (d.type === 'bogo') return `${d.buyQuantity ?? '?'}+${d.getQuantity ?? '?'}`;
  return d.type === 'fixed_amount' ? `₺${d.value.toLocaleString('tr-TR')}` : `%${d.value}`;
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
