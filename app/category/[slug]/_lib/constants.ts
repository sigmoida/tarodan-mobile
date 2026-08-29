import type { TFunction } from 'i18next';

// Etiketler çeviriden geldiği için FABRİKA: modül seviyesinde kurulsaydı `t`
// daha hazır olmadan çalışır ve etiketler ilk dilde donardı (bkz.
// `buildConditionOptions` / `buildSortOptions` başındaki aynı gerekçe).
export const buildSortOptions = (t: TFunction) => [
  { id: 'created_desc', name: t('product.sortNewest') },
  { id: 'created_asc', name: t('product.sortOldest') },
  { id: 'price_asc', name: t('product.sortPriceLow') },
  { id: 'price_desc', name: t('product.sortPriceHigh') },
];
