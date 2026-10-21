/**
 * Filtreli / sıralı ürün listesi giriş noktaları → arama ekranı (`/search`). Ayrı liste rotası
 * (`/listings`) YOK: "Takas vitrini", "Popüler ilanlar", "İndirimdekiler", "Yeni gelenler",
 * "Tüm ilanlar", kategori/üretici/ölçek kutuları hepsi aramayı ön filtreyle açar; filtreler açılışta
 * uygulanır ve kaldırılabilir çip olarak görünür (`filtersFromSearchParams` + `buildActiveChips`).
 *
 * Parametre adları web `/listings?…` ile aynı (`tradeOnly`, `discountOnly`, `sortBy`, `categoryId`,
 * `manufacturerId`…) — eski bağlantılar sorgusu değişmeden `/search`'e taşınır (`listingsToSearchHref`).
 */

import type { MessageKey } from '@/i18n/lib';
import { filtersFromSearchParams, type ProductFilters } from '@/utils/productFilters';

/** Sabit vitrin girişleri ve uyguladıkları filtre/sıralama (web ana sayfa `viewAllHref` + menü). */
export const SEARCH_ENTRIES = {
  /** Tüm ilanlar / Öne çıkanlar "Tümünü gör" — filtresiz. */
  all: {},
  /** Popüler ilanlar / Çok satanlar — en çok görüntülenen. */
  popular: { sortBy: 'view_count_desc' },
  /** Yeni gelenler — en yeni. */
  newArrivals: { sortBy: 'created_desc' },
  /** İndirimdekiler. */
  onSale: { discountOnly: 'true' },
  /** Takas vitrini — takasa açık ilanlar. */
  tradeShowcase: { tradeOnly: 'true' },
} as const satisfies Record<string, Record<string, string>>;

export type SearchEntry = keyof typeof SEARCH_ENTRIES;

/** Vitrin girişinin arama ekranındaki bağlam başlığı (web `/listings` başlığıyla aynı anahtarlar). */
const CURATED_ENTRY_LABELS: Partial<Record<SearchEntry, MessageKey>> = {
  popular: 'home.popularListings',
  newArrivals: 'nav.newArrivals',
  onSale: 'product.onSale',
  tradeShowcase: 'nav.tradeShowcase',
};

/** Field-by-field comparison (key order does not matter); empty custom attribute groups are ignored. */
const nonEmptyAttrs = (f: ProductFilters) =>
  JSON.stringify(
    Object.entries(f.customAttributes ?? {})
      .filter(([, v]) => v?.length)
      .sort(([x], [y]) => x.localeCompare(y)),
  );
const sameFilters = (a: ProductFilters, b: ProductFilters) =>
  (Object.keys(b) as (keyof ProductFilters)[]).every((k) => {
    if (k === 'customAttributes') return nonEmptyAttrs(a) === nonEmptyAttrs(b);
    // Colours are a list: compare by value, order included (a different pick is a different search).
    if (k === 'colors') return a.colors.join(',') === b.colors.join(',');
    return (a[k] ?? '') === (b[k] ?? '');
  }) && a.search.trim() === '';

/**
 * Canlı filtreler bir vitrin girişinin ön ayarıyla BİREBİR aynıysa (arama metni yok, başka filtre
 * yok, sıralama değişmemiş) o girişin başlık anahtarı; aksi halde null. Kullanıcı filtre/sıralamayı
 * değiştirince başlık kendiliğinden kaybolur.
 */
export function curatedEntryLabelKey(filters: ProductFilters): MessageKey | null {
  for (const [entry, key] of Object.entries(CURATED_ENTRY_LABELS) as [SearchEntry, MessageKey][]) {
    if (sameFilters(filters, filtersFromSearchParams(SEARCH_ENTRIES[entry]))) return key;
  }
  return null;
}

type ParamValue = string | number | boolean | null | undefined | readonly string[];

/** `/search?…` adresi; boş değerler atlanır, değerler kodlanır (sıra korunur). */
export function searchHref(params: Record<string, ParamValue> = {}): `/search${string}` {
  const pairs: string[] = [];
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : (raw as Exclude<ParamValue, readonly string[]>);
    if (value === undefined || value === null || value === '' || value === false) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return pairs.length ? `/search?${pairs.join('&')}` : '/search';
}

/** Sabit vitrin girişinin arama adresi (ör. `tradeShowcase` → `/search?tradeOnly=true`). */
export const searchEntryHref = (entry: SearchEntry) => searchHref(SEARCH_ENTRIES[entry]);

/** Kategori kutusu / ürünün kategorisi: kimlik (API süzgeci) + ad (çip etiketi). */
export const searchCategoryHref = (cat: { id: string; name: string }) =>
  searchHref({ categoryId: cat.id, category: cat.name });

/** Üretici kutusu: ad (çip etiketi) + kimlik (API süzgeci, ad eşleşmesinden bağımsız). */
export const searchManufacturerHref = (m: { id?: string; name: string }) =>
  searchHref({ manufacturer: m.name, manufacturerId: m.id });

export const searchScaleHref = (scale: string) => searchHref({ scale });

/**
 * Eski `/listings?…` adresi (derin bağlantı, push, reklam/hero CTA, eski kayıtlı yol) →
 * `/search?…`. Sorgu dizesi AYNEN taşınır: arama ekranı web parametre adlarını okur.
 * `query` başında `?` olabilir de olmayabilir de.
 */
export function listingsToSearchHref(query = ''): `/search${string}` {
  const q = query.startsWith('?') ? query.slice(1) : query;
  return q ? `/search?${q}` : '/search';
}
