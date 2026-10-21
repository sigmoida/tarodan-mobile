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
/** Kimlikten ad çözmek için seçenek listeleri (filtre sayfasının verisi). */
export type ChipNameOptions = Partial<
  Pick<ProductFilterOptions, 'categories' | 'brands' | 'manufacturers' | 'carModels' | 'colors'>
>;

/**
 * Çip etiketi: filtrenin taşıdığı ad → seçenek listesinden kimlikle bulunan ad → genel etiket
 * ("Kategori"/"Marka"/"Üretici"; liste henüz yüklenmediyse ya da kimlik listede yoksa). Böylece
 * yalnız kimlikle gelen filtre (derin bağlantı, `?categoryId=`) de görünür ve kaldırılabilir.
 */
const chipName = (
  name: string,
  id: string,
  list: ReadonlyArray<{ id: string; name: string }> | undefined,
  fallback: string,
) => name.trim() || list?.find((o) => o.id === id)?.name || fallback;

export function buildActiveChips(
  filters: ProductFilters,
  setFilters: SetFilters,
  t: TFunction,
  attributeGroups: ProductFilterOptions['customAttributes'] = [],
  names: ChipNameOptions = {},
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const add = (key: string, label: string, patch: (prev: ProductFilters) => Partial<ProductFilters>) =>
    chips.push({ key, label, onRemove: () => setFilters((prev) => ({ ...prev, ...patch(prev) })) });

  if (filters.category || filters.categoryId)
    add('cat', chipName(filters.category, filters.categoryId, names.categories, t('common.category')), () => ({
      category: '',
      categoryId: '',
    }));
  if (filters.brand || filters.brandId)
    add('brand', chipName(filters.brand, filters.brandId, names.brands, t('product.brand')), () => ({
      brand: '',
      brandId: '',
      // A car model belongs to its brand: clearing the brand clears the model (web handler).
      carModelId: '',
      carModel: '',
    }));
  if (filters.carModel || filters.carModelId)
    add('model', chipName(filters.carModel, filters.carModelId, names.carModels, t('product.model')), () => ({
      carModel: '',
      carModelId: '',
    }));
  if (filters.manufacturer || filters.manufacturerId)
    add('manuf', chipName(filters.manufacturer, filters.manufacturerId, names.manufacturers, t('product.manufacturer')), (prev) => ({
      manufacturer: '',
      manufacturerId: '',
      // Üreticiye bağlı grup seçimleri düşer, genel gruplar kalır (filtre sayfasıyla aynı kural).
      customAttributes: keepGeneralAttributeSelections(prev.customAttributes, attributeGroups),
    }));
  if (filters.scale) add('scale', filters.scale, () => ({ scale: '' }));
  if (filters.material) add('mat', filters.material, () => ({ material: '' }));
  // One chip per colour (web): removing one keeps the other picks.
  for (const slug of filters.colors)
    add(`color:${slug}`, names.colors?.find((c) => c.slug === slug)?.label || slug, (prev) => ({
      colors: prev.colors.filter((s) => s !== slug),
    }));
  if (filters.condition)
    add('cond', conditionLabel(filters.condition, t), () => ({ condition: '' }));
  if (filters.minPrice || filters.maxPrice)
    add('price', formatPriceRange(filters.minPrice, filters.maxPrice), () => ({ minPrice: '', maxPrice: '' }));
  if (filters.tradeOnly) add('trade', t('filter.tradeOnlyChip'), () => ({ tradeOnly: false }));
  if (filters.preOrder) add('preOrder', t('product.preOrder'), () => ({ preOrder: false }));
  if (filters.limited) add('limited', t('product.limitedEdition'), () => ({ limited: false }));
  if (filters.set) add('set', t('product.sets'), () => ({ set: false }));
  if (filters.discountOnly) add('disc', t('filter.discountOnlyLabel'), () => ({ discountOnly: false }));
  return chips;
}
