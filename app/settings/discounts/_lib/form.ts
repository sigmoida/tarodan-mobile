import type { MessageKey } from '@/i18n/lib';
import { isQuantityType, type DiscountForm } from './types';

/**
 * İndirim formu doğrulaması + gövde kurucu (saf). Kurallar API ile aynı
 * (`assertQuantityTypeShape`): bogo -> al/bedava >= 1; bulk_quantity -> en az
 * adet >= 2 ve yüzde 0-100. Adet koşullu kampanya KODSUZ-otomatiktir.
 */
export function discountFormError(form: DiscountForm): MessageKey | null {
  if (!form.name.trim()) return 'discount.nameRequired';
  const valueNum = parseFloat(form.value);
  if (form.type !== 'bogo' && (!valueNum || valueNum <= 0)) return 'discount.valueInvalid';
  if ((form.type === 'percentage' || form.type === 'bulk_quantity') && valueNum > 100) {
    return 'discount.percentTooHigh';
  }
  if (form.type === 'bogo') {
    if (!(parseInt(form.buyQuantity, 10) >= 1)) return 'discount.buyQuantityMin1';
    if (!(parseInt(form.getQuantity, 10) >= 1)) return 'discount.getQuantityMin1';
  }
  if (form.type === 'bulk_quantity' && !(parseInt(form.minQuantity, 10) >= 2)) {
    return 'discount.minQuantityMin2';
  }
  if (form.scope === 'product' && form.targetProductIds.length === 0) return 'discount.pickAtLeastOne';
  return null;
}

/** `common.error` başlığı gerektiren hata anahtarları (diğerleri `common.missing`). */
export const isRangeError = (key: MessageKey) =>
  key === 'discount.percentTooHigh' ||
  key === 'discount.buyQuantityMin1' ||
  key === 'discount.getQuantityMin1' ||
  key === 'discount.minQuantityMin2';

export function buildDiscountPayload(form: DiscountForm) {
  const quantityType = isQuantityType(form.type);
  return {
    // Adet koşullu kampanya kod istemez (sunucu kodsuz çalıştırır).
    code: quantityType ? undefined : form.code.trim() || undefined,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    type: form.type,
    // bogo'da değer kullanılmaz; bedava adet buy/get'ten gelir.
    value: form.type === 'bogo' ? 0 : parseFloat(form.value),
    buyQuantity: form.type === 'bogo' ? parseInt(form.buyQuantity, 10) : undefined,
    getQuantity: form.type === 'bogo' ? parseInt(form.getQuantity, 10) : undefined,
    minQuantity: form.type === 'bulk_quantity' ? parseInt(form.minQuantity, 10) : undefined,
    scope: form.scope,
    targetProductIds: form.scope === 'product' ? form.targetProductIds : [],
    minCartValue: form.minCartValue ? parseFloat(form.minCartValue) : undefined,
    maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
    usageLimitTotal: form.usageLimitTotal ? parseInt(form.usageLimitTotal, 10) : undefined,
    usageLimitPerUser: parseInt(form.usageLimitPerUser, 10) || 1,
    isStackable: form.isStackable,
    isActive: form.isActive,
    startDate: new Date(form.startDate).toISOString(),
    endDate: new Date(form.endDate).toISOString(),
  };
}
