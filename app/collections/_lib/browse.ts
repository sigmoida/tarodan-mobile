import type { MessageKey } from '@/i18n/lib/generated/keys';

/**
 * Koleksiyon tarama (web `collections/_lib/data.ts` + `CollectionsContext`) — sıralama seçenekleri,
 * API parametreleri, yanıt açma ve "Benim" sekmesinin istemci tarafı arama/sıralaması. TEK kaynak:
 * hook ve ekran buradan okur.
 */

export interface BrowseCollection {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  itemCount?: number;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  userName?: string;
  [key: string]: unknown;
}

export type BrowseTab = 'public' | 'mine';

/** API `sortBy` değerleri (collection.controller.ts `browse`). */
export type SortOption = 'popular' | 'recent' | 'name' | 'items_desc' | 'items_asc';

export const DEFAULT_SORT: SortOption = 'popular';

/** API varsayılanı 20; sonsuz listede sayfa boyu. */
export const PUBLIC_PAGE_SIZE = 20;

/** Arama kutusu → sunucu araması gecikmesi (listings ile aynı). */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Web `CollectionsToolbar` sıralama seçicisiyle aynı sıra/etiketler. "A-Z" web'de de çevrilmeyen
 * sabit metin (`label`); diğerleri i18n anahtarı (`labelKey`).
 */
export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; labelKey?: MessageKey; label?: string }> = [
  { value: 'popular', labelKey: 'common.popular' },
  { value: 'recent', labelKey: 'common.newest' },
  { value: 'name', label: 'A-Z' },
  { value: 'items_desc', labelKey: 'common.desc' },
  { value: 'items_asc', labelKey: 'common.asc' },
];

export interface CollectionsPage {
  collections: BrowseCollection[];
  total: number;
  page: number;
  pageSize: number;
}

/** Web `buildBrowseParams`: `search`/`categoryId` kırpılmış beklenir, boşsa gönderilmez. */
export function buildBrowseParams(
  sortBy: SortOption,
  search: string,
  categoryId: string,
): Record<string, string> {
  return {
    sortBy,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}

/** `/collections/browse` ve `/collections/me` gövdesi → sayfa şekli (web `unwrapPublicCollections`). */
export function unwrapCollectionsPage(raw: unknown, fallbackPage = 1): CollectionsPage {
  const body = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(raw) ? raw : (body.collections ?? body.data ?? []);
  const collections = (Array.isArray(list) ? list : []) as BrowseCollection[];
  const total = typeof body.total === 'number' ? body.total : collections.length;
  const page = typeof body.page === 'number' ? body.page : fallbackPage;
  const pageSize = typeof body.pageSize === 'number' ? body.pageSize : PUBLIC_PAGE_SIZE;
  return { collections, total, page, pageSize };
}

/** Sonraki sayfa numarası; son sayfaysa (ya da sayfa boşsa) `undefined`. */
export function getNextBrowsePage(last: CollectionsPage): number | undefined {
  if (last.collections.length === 0) return undefined;
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

/** Sayfaları tek listeye indirir; ofset sayfalamada kayan kayıtlar iki kez görünmesin (id tekil). */
export function flattenPages(pages: ReadonlyArray<CollectionsPage> | undefined): BrowseCollection[] {
  const seen = new Set<string>();
  const out: BrowseCollection[] = [];
  for (const p of pages ?? []) {
    for (const c of p.collections) {
      const key = String(c.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug?: string;
  children?: CategoryNode[];
}

/** Web `flattenCategories`: alt kategoriler "— Ad" önekiyle düz listeye. */
export function flattenCategories(tree: ReadonlyArray<CategoryNode>, prefix = ''): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const c of tree) {
    out.push({ id: String(c.id), name: prefix ? `${prefix} ${c.name}` : c.name });
    if (c.children?.length) out.push(...flattenCategories(c.children, '—'));
  }
  return out;
}

/** `/categories` gövdesi → ağaç dizisi (web `unwrapCategories`). */
export function unwrapCategories(raw: unknown): CategoryNode[] {
  const data = (raw as { data?: unknown } | null)?.data ?? raw ?? [];
  return Array.isArray(data) ? (data as CategoryNode[]) : [];
}

const nameCollator = new Intl.Collator('tr', { sensitivity: 'base' });

/** Arama eşleştirmesi: Türkçe küçük harf + noktasız ı → i ("FERRARI" ile "Ferrari" eşleşsin). */
const fold = (s: unknown) => String(s ?? '').toLocaleLowerCase('tr').replace(/ı/g, 'i');

/**
 * "Benim" sekmesi (web `filteredAndSortedCollections`): `/collections/me` sıralama/arama
 * parametresi almadığı için istemcide süzülür ve sıralanır.
 */
export function filterAndSortMine(
  list: ReadonlyArray<BrowseCollection>,
  search: string,
  sortBy: SortOption,
): BrowseCollection[] {
  const q = fold(search.trim());
  const filtered = q
    ? list.filter((c) => fold(c.name).includes(q) || fold(c.description).includes(q) || fold(c.userName).includes(q))
    : [...list];
  const time = (c: BrowseCollection) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);
  switch (sortBy) {
    case 'popular':
      return filtered.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    case 'recent':
      return filtered.sort((a, b) => time(b) - time(a));
    case 'name':
      return filtered.sort((a, b) => nameCollator.compare(String(a.name ?? ''), String(b.name ?? '')));
    case 'items_asc':
      return filtered.sort((a, b) => (a.itemCount ?? 0) - (b.itemCount ?? 0));
    case 'items_desc':
      return filtered.sort((a, b) => (b.itemCount ?? 0) - (a.itemCount ?? 0));
    default:
      return filtered;
  }
}
