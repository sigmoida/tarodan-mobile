import { isQuantityType } from './types';
import type { DiscountFormValues } from './schema';

/**
 * Gövde kurucu. `isUpdate` (PATCH) iken TEMİZLENEN alanlar `null` gider: `undefined`
 * JSON'dan düşer ve sunucu eski değeri korur (ör. bogo'dan yüzdeye geçince
 * `buyQuantity`/`getQuantity` sunucuda kalırdı). API DTO'su `@IsOptional()` ile null'u
 * kabul eder ve `update` null'u sütuna yazar (`discount-crud.service`). Oluşturmada
 * alan hiç gönderilmez (`undefined`).
 */
export function buildDiscountPayload(form: DiscountFormValues, isUpdate = false) {
  const quantityType = isQuantityType(form.type);
  // Temizlenen alan: güncellemede null (sunucuda silinir), oluşturmada atlanır.
  const cleared = isUpdate ? null : undefined;
  return {
    // Adet koşullu kampanya kod istemez (sunucu kodsuz çalıştırır).
    code: quantityType ? cleared : form.code.trim() || undefined,
    name: form.name.trim(),
    description: form.description.trim() || cleared,
    type: form.type,
    // bogo'da değer kullanılmaz; bedava adet buy/get'ten gelir.
    value: form.type === 'bogo' ? 0 : parseFloat(form.value),
    buyQuantity: form.type === 'bogo' ? parseInt(form.buyQuantity, 10) : cleared,
    getQuantity: form.type === 'bogo' ? parseInt(form.getQuantity, 10) : cleared,
    minQuantity: form.type === 'bulk_quantity' ? parseInt(form.minQuantity, 10) : cleared,
    scope: form.scope,
    targetProductIds: form.scope === 'product' ? form.targetProductIds : [],
    minCartValue: form.minCartValue ? parseFloat(form.minCartValue) : cleared,
    maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : cleared,
    usageLimitTotal: form.usageLimitTotal ? parseInt(form.usageLimitTotal, 10) : cleared,
    usageLimitPerUser: parseInt(form.usageLimitPerUser, 10) || 1,
    isStackable: form.isStackable,
    isActive: form.isActive,
    startDate: new Date(form.startDate).toISOString(),
    endDate: new Date(form.endDate).toISOString(),
  };
}
