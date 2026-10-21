import type { TFunction } from 'i18next';
import type { MessageKey } from '@/i18n/lib';
import { z } from 'zod';
import { parseTlAmount, tlAmountInputValue } from '@/lib/shared/tlAmount';
import type { Discount } from './types';

/**
 * The discount form schema (colocated, src/ui/CLAUDE.md › Forms). The rules match the API
 * (`assertQuantityTypeShape`): bogo -> buy/get >= 1; bulk_quantity -> minimum quantity >= 2
 * and a percent of 1-100. A quantity campaign has no code: it applies automatically.
 *
 * The fields come from text inputs, so they stay strings (`z.input` = `z.output`); the numbers
 * are read in the payload builder (`buildDiscountPayload`). The value and the TL amounts are
 * read by the shared TL amount parser, as on web: "1.000" is refused
 * (`validation.amountFormatRefused` for TL, the value copy for a percent), never read as 1.
 * Conditional rules are bound to the FIELD PATH with `superRefine`, so the error shows under
 * the input it is about.
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

      // bogo has no value. A percentage stays within 0-100 and every value is above zero; a
      // refused percent gets the value copy (the format copy speaks of kuruş).
      if (v.type !== 'bogo') {
        const parsed = parseTlAmount(v.value);
        if (parsed.status === 'refused' && v.type === 'fixed_amount') {
          fail('value', 'validation.amountFormatRefused');
        } else if (parsed.status !== 'ok') fail('value', 'discount.valueInvalid');
        else if (v.type !== 'fixed_amount' && parsed.amount > 100) fail('value', 'discount.percentTooHigh');
      }
      for (const path of ['minCartValue', 'maxDiscountAmount'] as const) {
        if (parseTlAmount(v[path]).status === 'refused') fail(path, 'validation.amountFormatRefused');
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
  // Comma decimals, no grouping: the text the amount parser reads back (web `fromDiscount`).
  value: tlAmountInputValue(Number(d.value)),
  buyQuantity: d.buyQuantity?.toString() ?? '',
  getQuantity: d.getQuantity?.toString() ?? '',
  minQuantity: d.minQuantity?.toString() ?? '',
  scope: d.scope === 'product' ? 'product' : 'seller',
  targetProductIds: d.targetProductIds ?? [],
  minCartValue: tlAmountInputValue(Number(d.minCartValue)),
  maxDiscountAmount: tlAmountInputValue(Number(d.maxDiscountAmount)),
  usageLimitTotal: d.usageLimitTotal?.toString() ?? '',
  usageLimitPerUser: String(d.usageLimitPerUser ?? 1),
  isStackable: d.isStackable,
  isActive: d.isActive,
  startDate: d.startDate.split('T')[0]!,
  endDate: d.endDate.split('T')[0]!,
});
