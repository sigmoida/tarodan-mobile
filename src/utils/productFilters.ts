/**
 * Web parity: the `Filters` state of the web listings route (`listings/_lib/params.ts`) and its
 * `buildListApiParams`. Every product search/list screen (Search, Listings) uses this single source.
 */
import type { TFunction } from 'i18next';

export type ProductFilters = {
  search: string;
  brand: string;
  brandId: string;
  /** Car model id (API filter `carModelId`) and its display name (chip label). */
  carModelId: string;
  carModel: string;
  scale: string;
  material: string;
  /** Selected colour slugs (multi-select, OR); `?color=red,black` in the URL, as on web. */
  colors: string[];
  condition: string;
  minPrice: string;
  maxPrice: string;
  tradeOnly: boolean;
  discountOnly: boolean;
  preOrder: boolean;
  limited: boolean;
  set: boolean;
  sortBy: string;
  category: string;
  categoryId: string;
  manufacturer: string;
  manufacturerId: string;
  /** Manufacturer-scoped attribute selections: { groupSlug: [attrSlug, ...] }. Same as web. */
  customAttributes: Record<string, string[]>;
};

export const EMPTY_FILTERS: ProductFilters = {
  search: '',
  brand: '',
  brandId: '',
  carModelId: '',
  carModel: '',
  scale: '',
  material: '',
  colors: [],
  condition: '',
  minPrice: '',
  maxPrice: '',
  tradeOnly: false,
  discountOnly: false,
  preOrder: false,
  limited: false,
  set: false,
  sortBy: 'relevance',
  category: '',
  categoryId: '',
  manufacturer: '',
  manufacturerId: '',
  customAttributes: {},
};

/**
 * Üretici değişince/kalkınca YALNIZ üreticiye bağlı grup seçimleri düşer. Genel özel
 * gruplar (`manufacturerSlug: null`, ör. Nadirlik) üreticiden bağımsızdır; seçimleri
 * kalır (delta 19). Genel olduğu `groups`'tan doğrulanamayan slug (bilinmeyen/yüklenmemiş)
 * güvenli tarafta düşürülür.
 *
 * TEK KAYNAK: filtre sayfası (seç/kaldır), arama sekmesi çipi ve Tüm ilanlar çipi
 * üretici kalkarken bunu kullanır; biri unutulursa kaldırılan üreticinin seçimi
 * isteğe bayat olarak girmeye devam eder.
 */
export function keepGeneralAttributeSelections(
  selections: Record<string, string[]> | undefined,
  groups: ReadonlyArray<{ slug: string; manufacturerSlug?: string | null }>,
): Record<string, string[]> {
  const general = new Set(groups.filter((g) => !g.manufacturerSlug).map((g) => g.slug));
  return Object.fromEntries(Object.entries(selections ?? {}).filter(([slug]) => general.has(slug)));
}

/**
 * Sort values of the picker, aligned with the web `ProductQueryDto`. A factory over the existing
 * `product.sort*` keys (built at call time: `useMemo(() => buildSortOptions(t), [t])`), so the
 * labels follow the active language. `sortPriceLow`/`sortPriceHigh` read clearer than the old
 * short labels, so they are reused instead of opening a second copy.
 */
const SORT_OPTION_KEYS = [
  ['relevance', 'common.recommended'],
  ['created_desc', 'product.sortNewest'],
  ['created_asc', 'product.sortOldest'],
  ['view_count_desc', 'product.sortPopular'],
  ['price_asc', 'product.sortPriceLow'],
  ['price_desc', 'product.sortPriceHigh'],
  ['rating_desc', 'product.sortHighestRating'],
  ['title_asc', 'page.listings.listingstoolbar.aZ'],
  ['title_desc', 'page.listings.listingstoolbar.zA'],
] as const;

/**
 * Sorts `GET /products` serves that the picker does not offer (web neither) but a URL can carry:
 * a saved search or a web link may hold `view_count_asc`. Accepted so such a URL keeps its order
 * instead of falling back to the default ranking.
 */
const URL_ONLY_SORTS = ['view_count_asc'] as const;

/** Accepted `sortBy` values of a URL: the picker's values plus `URL_ONLY_SORTS` (= every explicit `GET /products` sort). */
const SORT_VALUES: ReadonlySet<string> = new Set<string>([
  ...SORT_OPTION_KEYS.map(([value]) => value),
  ...URL_ONLY_SORTS,
]);

export const buildSortOptions = (t: TFunction): { value: string; label: string }[] =>
  SORT_OPTION_KEYS.map(([value, key]) => ({ value, label: t(key) }));

/**
 * Web SidebarFilters CONDITIONS ile aynı slug seti — etiketler artık katalogdan
 * gelir. Eskiden bu bir modül-seviyesi TR literal dizisiydi: `t()` hiç
 * çağrılmadığı için i18next hazır olsun olmasın hep Türkçe basardı (bir yarış
 * değil, kalıcı bir Türkçe basımıydı). `ProductFilterSheet` artık bunun yerine
 * listing formundaki `buildConditions(t)` ile AYNI katalog anahtarlarını
 * (`product.condition*`) kullanan bu factory'i çağırır: bileşen
 * `useMemo(() => buildConditionOptions(t), [t])` ile — tek koşul kelime
 * dağarcığı, iki ayrı metin seti değil.
 */
export const buildConditionOptions = (t: TFunction): { value: string; label: string }[] => [
  { value: 'new', label: t('product.conditionNew') },
  { value: 'like_new', label: t('product.conditionLikeNew') },
  { value: 'very_good', label: t('product.conditionVeryGood') },
  { value: 'good', label: t('product.conditionGood') },
  { value: 'fair', label: t('product.conditionFair') },
];

// NOT: Ölçek/malzeme için İSTEMCİ FALLBACK'İ BİLEREK YOK. Sunucu boş dizi
// döndürebiliyor ve bu "katalogda yok" demek; yerine bir liste koymak
// kullanıcıya karşılığı olmayan filtre seçenekleri gösteriyordu (P2 #13).

/**
 * Same param logic as web `buildListApiParams` (same names): an id wins over its display name
 * (`brandId` over `brand`, `manufacturerId` over `manufacturer`); `color` is the comma-joined slugs.
 */
export function buildListParams(
  f: ProductFilters,
  page: number,
  limit: number,
): Record<string, any> {
  const p: Record<string, any> = { limit, page };
  const search = f.search.trim();
  if (search) p.search = search;
  if (f.categoryId) p.categoryId = f.categoryId;
  if (f.condition) p.condition = f.condition;
  if (f.minPrice) p.minPrice = Number(f.minPrice);
  if (f.maxPrice) p.maxPrice = Number(f.maxPrice);
  if (f.brandId) p.brandId = f.brandId;
  else if (f.brand) p.brand = f.brand;
  if (f.carModelId) p.carModelId = f.carModelId;
  if (f.scale) p.scale = f.scale;
  if (f.material) p.material = f.material;
  if (f.colors.length > 0) p.color = f.colors.join(',');
  if (f.manufacturerId) p.manufacturerId = f.manufacturerId;
  else if (f.manufacturer) p.manufacturer = f.manufacturer;
  // Manufacturer-scoped attribute selections: the backend applies OR within a group and AND across
  // groups. Empty groups are dropped. Same as web (`attrGroups` JSON).
  if (f.customAttributes) {
    const nonEmpty = Object.fromEntries(
      Object.entries(f.customAttributes).filter(
        ([, slugs]) => Array.isArray(slugs) && slugs.length > 0,
      ),
    );
    if (Object.keys(nonEmpty).length > 0) p.attrGroups = JSON.stringify(nonEmpty);
  }
  if (f.tradeOnly) p.tradeOnly = true;
  if (f.discountOnly) p.discountOnly = true;
  if (f.preOrder) p.preOrder = true;
  if (f.limited) p.limited = true;
  if (f.set) p.set = true;
  // As on web: 'relevance' (Recommended) is the server default, so no parameter is sent.
  if (f.sortBy && f.sortBy !== 'relevance') p.sortBy = f.sortBy;
  return p;
}

/**
 * "Temizle": filtreleri sıfırlar, sıralamayı ve arama metnini KORUR (web ListingsContext'in
 * kullanıcı beklentisi: üst arama kutusu ve sıralama bir "filtre" değil, görünüm tercihidir).
 * TEK KAYNAK — ilanlar ve arama ekranları bunu kullanır.
 */
export function clearProductFilters(f: ProductFilters): ProductFilters {
  return { ...EMPTY_FILTERS, search: f.search, sortBy: f.sortBy };
}

/**
 * Active filter count: paired keys (brand+brandId, ...) count once. `sortBy` and `search` are NOT
 * counted: both survive "Clear" and show in the top bar.
 */
export function countActiveFilters(f: ProductFilters): number {
  let count = 0;
  if (f.brand || f.brandId) count += 1;
  if (f.carModel || f.carModelId) count += 1;
  if (f.manufacturer || f.manufacturerId) count += 1;
  if (f.category || f.categoryId) count += 1;
  if (f.scale) count += 1;
  if (f.material) count += 1;
  // Colours count as ONE filter however many are picked (web `activeFilterCount`).
  if (f.colors.length > 0) count += 1;
  if (f.condition) count += 1;
  if (f.minPrice || f.maxPrice) count += 1;
  if (f.tradeOnly) count += 1;
  if (f.discountOnly) count += 1;
  if (f.preOrder) count += 1;
  if (f.limited) count += 1;
  if (f.set) count += 1;
  // Each non-empty manufacturer-attribute group counts as one filter.
  count += Object.values(f.customAttributes ?? {}).filter((v) => v.length > 0).length;
  return count;
}

/** API yanıtından ürün dizisini çıkar (dizi / {data} / {products} / {items}). */
export function extractListings(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.products)) return raw.products;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  return [];
}

/**
 * Sayfaları tek listeye birleştirir ve `id`'ye göre TEKİLLEŞTİRİR. Sunucu aynı değerli
 * satırlarda (fiyat/başlık eşitliği) sayfalar arası kararsız sıralayabildiği için bir ilan iki
 * sayfada birden gelebilir; ızgara anahtarı `id` olduğundan tekrarlar yinelenen anahtar
 * (ve çift kart) demektir. İlk görülen kalır, sıra korunur.
 */
export function flattenUniqueListings<T extends { id?: string | number }>(
  pages: ReadonlyArray<{ items: readonly T[] }> | undefined,
): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const page of pages ?? []) {
    for (const item of page.items) {
      if (item.id != null) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
      }
      out.push(item);
    }
  }
  return out;
}

/** API yanıtından sayfalama meta'sını çıkar. */
export function extractMeta(
  raw: any,
  page: number,
  limit: number,
): { total: number; page: number; limit: number; totalPages: number } {
  const m = raw?.meta;
  const items = extractListings(raw);
  return {
    total: m?.total ?? items.length,
    page: m?.page ?? page,
    limit: m?.limit ?? limit,
    totalPages: m?.totalPages ?? 1,
  };
}

/** URL param: expo-router `useLocalSearchParams` can return an array for a repeated key; the first one wins. */
type RawParam = string | string[] | undefined;
const firstParam = (v: RawParam): string => (Array.isArray(v) ? v[0] ?? '' : v ?? '');

/**
 * The search screen's opening filters, read from URL params (single source). The names are the web
 * `/listings` ones (`parseListingsFilters`) and what `savedSearchToRouteParams` emits, display
 * names included (`category`, `brand`, `manufacturer`, `carModel`): old `/listings?...` links,
 * ad/push/deep-link queries, home "See all" addresses and saved-search runs carry over to `/search`
 * as they are. Free text is read from `q` (the legacy name) or `search` (the web name; what links and
 * saved searches write, and what mobile now writes); both stay readable. Manufacturer attributes are `attr.<group>=a,b`, colours `color=a,b`.
 */
export function filtersFromSearchParams(params: Record<string, RawParam>): ProductFilters {
  const get = (k: string) => firstParam(params[k]).trim();
  const sortBy = get('sortBy');
  const customAttributes: Record<string, string[]> = {};
  for (const key of Object.keys(params)) {
    if (!key.startsWith('attr.')) continue;
    const group = key.slice('attr.'.length);
    const slugs = firstParam(params[key]).split(',').map((s) => s.trim()).filter(Boolean);
    if (group && slugs.length) customAttributes[group] = slugs;
  }
  return {
    ...EMPTY_FILTERS,
    search: get('q') || get('search'),
    brand: get('brand'),
    brandId: get('brandId'),
    carModelId: get('carModelId'),
    carModel: get('carModel'),
    scale: get('scale'),
    material: get('material'),
    colors: [...new Set(get('color').split(',').map((s) => s.trim()).filter(Boolean))],
    condition: get('condition'),
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    tradeOnly: get('tradeOnly') === 'true',
    discountOnly: get('discountOnly') === 'true',
    preOrder: get('preOrder') === 'true',
    limited: get('limited') === 'true',
    set: get('set') === 'true',
    sortBy: SORT_VALUES.has(sortBy) ? sortBy : EMPTY_FILTERS.sortBy,
    category: get('category'),
    categoryId: get('categoryId'),
    manufacturer: get('manufacturer'),
    manufacturerId: get('manufacturerId'),
    customAttributes,
  };
}
