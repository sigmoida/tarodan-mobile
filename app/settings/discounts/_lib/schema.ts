import type { TFunction } from 'i18next';
import type { MessageKey } from '@/i18n/lib';
import { z } from 'zod';
import type { Discount } from './types';

/**
 * İndirim formu şeması (colocated, CLAUDE.md §7). Kurallar API ile aynı
 * (`assertQuantityTypeShape`): bogo -> al/bedava >= 1; bulk_quantity -> en az
 * adet >= 2 ve yüzde 1-100. Adet koşullu kampanya KODSUZ-otomatiktir.
 *
 * Alanlar giriş kutularından geldiği için string tutulur (`z.input` = `z.output`);
 * sayıya çevirme gövde kurucuda (`buildDiscountPayload`). Koşullu kurallar
 * `superRefine` ile ALAN YOLUNA bağlanır: hata, ilgili girdinin altında görünür.
 */
export const DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'bogo', 'bulk_quantity'] as const;

const isValidDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function discountSchema(t: TFunction) {
  return z
    .object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      type: z.enum(DISCOUNT_TYPES),
      value: z.string(),
      // bogo: "X al" / "Y bedava"; bulk_quantity: en az adet.
      buyQuantity: z.string(),
      getQuantity: z.string(),
      minQuantity: z.string(),
      scope: z.enum(['seller', 'product']),
      targetProductIds: z.array(z.string()),
      minCartValue: z.string(),
      maxDiscountAmount: z.string(),
      usageLimitTotal: z.string(),
      usageLimitPerUser: z.string(),
      isStackable: z.boolean(),
      isActive: z.boolean(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .superRefine((v, ctx) => {
      const fail = (path: keyof typeof v, key: MessageKey) =>
        ctx.addIssue({ code: 'custom', path: [path], message: t(key) });

      if (!v.name.trim()) fail('name', 'discount.nameRequired');

      const valueNum = parseFloat(v.value);
      if (v.type !== 'bogo') {
        if (!valueNum || valueNum <= 0) fail('value', 'discount.valueInvalid');
        else if ((v.type === 'percentage' || v.type === 'bulk_quantity') && valueNum > 100) {
          fail('value', 'discount.percentTooHigh');
        }
      }
      if (v.type === 'bogo') {
        if (!(parseInt(v.buyQuantity, 10) >= 1)) fail('buyQuantity', 'discount.buyQuantityMin1');
        if (!(parseInt(v.getQuantity, 10) >= 1)) fail('getQuantity', 'discount.getQuantityMin1');
      }
      if (v.type === 'bulk_quantity' && !(parseInt(v.minQuantity, 10) >= 2)) {
        fail('minQuantity', 'discount.minQuantityMin2');
      }
      if (v.scope === 'product' && v.targetProductIds.length === 0) {
        fail('targetProductIds', 'discount.pickAtLeastOne');
      }
      // `new Date(bozuk).toISOString()` RangeError fırlatırdı.
      if (!isValidDay(v.startDate)) fail('startDate', 'discount.dateInvalid');
      if (!isValidDay(v.endDate)) fail('endDate', 'discount.dateInvalid');
    });
}

export type DiscountFormValues = z.input<ReturnType<typeof discountSchema>>;

const DAY_MS = 24 * 60 * 60 * 1000;

export const discountDefaultValues = (): DiscountFormValues => ({
  code: '',
  name: '',
  description: '',
  type: 'percentage',
  value: '10',
  buyQuantity: '',
  getQuantity: '',
  minQuantity: '',
  scope: 'seller',
  targetProductIds: [],
  minCartValue: '',
  maxDiscountAmount: '',
  usageLimitTotal: '',
  usageLimitPerUser: '1',
  isStackable: false,
  isActive: true,
  startDate: new Date().toISOString().split('T')[0]!,
  endDate: new Date(Date.now() + 30 * DAY_MS).toISOString().split('T')[0]!,
});

/** Düzenleme: kayıttaki indirimden form değerleri (eksik alanlar boş string). */
export const discountToFormValues = (d: Discount): DiscountFormValues => ({
  code: d.code ?? '',
  name: d.name,
  description: d.description ?? '',
  type: d.type,
  value: String(d.value),
  buyQuantity: d.buyQuantity?.toString() ?? '',
  getQuantity: d.getQuantity?.toString() ?? '',
  minQuantity: d.minQuantity?.toString() ?? '',
  scope: d.scope === 'product' ? 'product' : 'seller',
  targetProductIds: d.targetProductIds ?? [],
  minCartValue: d.minCartValue?.toString() ?? '',
  maxDiscountAmount: d.maxDiscountAmount?.toString() ?? '',
  usageLimitTotal: d.usageLimitTotal?.toString() ?? '',
  usageLimitPerUser: String(d.usageLimitPerUser ?? 1),
  isStackable: d.isStackable,
  isActive: d.isActive,
  startDate: d.startDate.split('T')[0]!,
  endDate: d.endDate.split('T')[0]!,
});
