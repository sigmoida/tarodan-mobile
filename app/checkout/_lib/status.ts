import type { TFunction } from 'i18next';

/**
 * `unavailableItems[].code` → metin. Kod KAPALI bir liste değil: bilinmeyen kodda
 * sunucunun kendi `message`'ı basılır (ileri uyum — yeni bir kod eklendiğinde
 * kullanıcı boş satır görmez).
 */
const UNAVAILABLE_KEYS: Record<string, string> = {
  PRODUCT_NOT_FOUND: 'checkout.unavailableProductNotFound',
  PRODUCT_NOT_ACTIVE: 'checkout.unavailableProductNotActive',
  SELLER_SALES_SUSPENDED: 'checkout.unavailableSellerSuspended',
};

export function unavailableReason(
  item: { code: string; message?: string },
  t: TFunction,
): string {
  const key = UNAVAILABLE_KEYS[item.code];
  return key ? t(key as any) : (item.message || '');
}
