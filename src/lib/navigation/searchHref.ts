/**
 * Filtreli / sıralı ürün listesi giriş noktaları → arama ekranı (`/search`). Ayrı liste rotası
 * (`/listings`) YOK: "Takas vitrini", "Popüler ilanlar", "İndirimdekiler", "Yeni gelenler",
 * "Tüm ilanlar", kategori/üretici/ölçek kutuları hepsi aramayı ön filtreyle açar; filtreler açılışta
 * uygulanır ve kaldırılabilir çip olarak görünür (`filtersFromSearchParams` + `buildActiveChips`).
 *
 * Parametre adları web `/listings?…` ile aynı (`tradeOnly`, `discountOnly`, `sortBy`, `categoryId`,
 * `manufacturerId`…) — eski bağlantılar sorgusu değişmeden `/search`'e taşınır (`listingsToSearchHref`).
 */

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
