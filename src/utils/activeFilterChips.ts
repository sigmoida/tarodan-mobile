import type { TFunction } from 'i18next';
import { formatPriceRange } from '@/utils/format';
import {
  buildConditionOptions,
  keepGeneralAttributeSelections,
  type ProductFilters,
} from '@/utils/productFilters';
import type { ProductFilterOptions } from '@/hooks/useProductFilterOptions';

export const conditionLabel = (v: string, t: TFunction) =>
  buildConditionOptions(t).find((c) => c.value === v)?.label || v;

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** `useState` setter'ı — çipler HER ZAMAN fonksiyonel güncelleme verir (bayat kapanım yok). */
export type SetFilters = (updater: (prev: ProductFilters) => ProductFilters) => void;

/**
 * Aktif filtrelerden kaldırılabilir çip listesi — ilanlar ve arama ekranlarının TEK kaynağı.
 * Her çipin "kaldır" davranışı `setFilters(prev => …)` ile bağlanır: çip render'ından sonra
 * gelen başka bir güncelleme (ör. debounce'lu arama metni) ezilmez.
 */
export function buildActiveChips(
  filters: ProductFilters,
  setFilters: SetFilters,
  t: TFunction,
  attributeGroups: ProductFilterOptions['customAttributes'] = [],
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const add = (key: string, label: string, patch: (prev: ProductFilters) => Partial<ProductFilters>) =>
    chips.push({ key, label, onRemove: () => setFilters((prev) => ({ ...prev, ...patch(prev) })) });

  if (filters.category) add('cat', filters.category, () => ({ category: '', categoryId: '' }));
  if (filters.brand) add('brand', filters.brand, () => ({ brand: '', brandId: '' }));
  if (filters.manufacturer)
    add('manuf', filters.manufacturer, (prev) => ({
      manufacturer: '',
      manufacturerId: '',
      // Üreticiye bağlı grup seçimleri düşer, genel gruplar kalır (filtre sayfasıyla aynı kural).
      customAttributes: keepGeneralAttributeSelections(prev.customAttributes, attributeGroups),
    }));
  if (filters.scale) add('scale', filters.scale, () => ({ scale: '' }));
  if (filters.material) add('mat', filters.material, () => ({ material: '' }));
  if (filters.condition)
    add('cond', conditionLabel(filters.condition, t), () => ({ condition: '' }));
  if (filters.minPrice || filters.maxPrice)
    add('price', formatPriceRange(filters.minPrice, filters.maxPrice), () => ({ minPrice: '', maxPrice: '' }));
  if (filters.tradeOnly) add('trade', t('filter.tradeOnlyChip'), () => ({ tradeOnly: false }));
  if (filters.discountOnly) add('disc', t('filter.discountOnlyLabel'), () => ({ discountOnly: false }));
  return chips;
}
