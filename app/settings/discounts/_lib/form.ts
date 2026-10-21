import type { CreateDiscountPayload, UpdateDiscountPayload } from '@/lib/api';
import { tlAmountValue } from '@/lib/shared/tlAmount';
import { isQuantityType } from './types';
import type { DiscountFormValues } from './schema';

/**
 * Gövde kurucu. `isUpdate` (PATCH) iken TEMİZLENEN alanlar `null` gider: `undefined`
 * JSON'dan düşer ve sunucu eski değeri korur (ör. bogo'dan yüzdeye geçince
 * `buyQuantity`/`getQuantity` sunucuda kalırdı). API DTO'su `@IsOptional()` ile null'u
 * kabul eder ve `update` null'u sütuna yazar (`discount-crud.service`). Oluşturmada
 * alan hiç gönderilmez (`undefined`).
 */
export function buildDiscountPayload(form: DiscountFormValues): CreateDiscountPayload;
export function buildDiscountPayload(form: DiscountFormValues, isUpdate: true): UpdateDiscountPayload;
export function buildDiscountPayload(
  form: DiscountFormValues,
  isUpdate = false,
): CreateDiscountPayload | UpdateDiscountPayload {
  const quantityType = isQuantityType(form.type);
  // Temizlenen alan: güncellemede null (sunucuda silinir), oluşturmada atlanır.
  const cleared = isUpdate ? null : undefined;
  // An optional TL bound, read by the shared parser (the schema refused malformed text): no
  // amount ("", "0", "0,00") is no bound, so a zero never goes out as a 0 TL cap or threshold.
  const optionalAmount = (raw: string) => {
    const amount = tlAmountValue(raw);
    return amount > 0 ? amount : cleared;
  };
  return {
    // Adet koşullu kampanya kod istemez (sunucu kodsuz çalıştırır).
    code: quantityType ? cleared : form.code.trim() || undefined,
    name: form.name.trim(),
    description: form.description.trim() || cleared,
    type: form.type,
    // bogo'da değer kullanılmaz; bedava adet buy/get'ten gelir.
    value: form.type === 'bogo' ? 0 : tlAmountValue(form.value),
    buyQuantity: form.type === 'bogo' ? parseInt(form.buyQuantity, 10) : cleared,
    getQuantity: form.type === 'bogo' ? parseInt(form.getQuantity, 10) : cleared,
    minQuantity: form.type === 'bulk_quantity' ? parseInt(form.minQuantity, 10) : cleared,
    scope: form.scope,
    targetProductIds: form.scope === 'product' ? form.targetProductIds : [],
    minCartValue: optionalAmount(form.minCartValue),
    maxDiscountAmount: optionalAmount(form.maxDiscountAmount),
    usageLimitTotal: form.usageLimitTotal ? parseInt(form.usageLimitTotal, 10) : cleared,
    usageLimitPerUser: parseInt(form.usageLimitPerUser, 10) || 1,
    isStackable: form.isStackable,
    isActive: form.isActive,
    startDate: new Date(form.startDate).toISOString(),
    endDate: new Date(form.endDate).toISOString(),
  };
}
