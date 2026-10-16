/**
 * Kategoriler ekranının grupları ve hedefleri — TEK kaynak (web `nav/config.ts`
 * `categoryBarItems` + `navHref`'in mobil karşılığı). Saf fonksiyonlar: veri → grup/kutu listesi,
 * kutu → `/listings` adresi. Ekran/hook bunları çağırır, adresi elle kurmaz.
 */
import type { TFunction } from 'i18next';
import { listingCount } from '@/utils/catalogListings';
import type { MessageKey } from '@/i18n/lib';

export type CategoryGroupKey = 'explore' | 'categories' | 'manufacturers' | 'scales';

/** `/categories` ağacındaki düğüm (`productCount` = o kategorideki doğrudan aktif ilan sayısı). */
export interface CategoryNode {
  id: string;
  name: string;
  slug?: string;
  productCount?: number | null;
  children?: CategoryNode[] | null;
}

export interface ManufacturerNode {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  productCount?: number | null;
  _count?: { products?: number | null } | null;
}

/** Izgaradaki bir kutu. `href` yoksa ve `children` varsa dokununca alt düzeye iner. */
export interface CategoryTileData {
  id: string;
  label: string;
  /** Dokununca açılacak yığın rotası (alt düzeye inen kutuda yok). */
  href?: string;
  /**
   * `logo`: görsel kutusu (logo ya da baş harf) + etiket · `plain`: yalnız etiketli çerçeveli kutu
   * (Keşfet, Ölçek — görseli olmayan öğeler).
   */
  visual: 'logo' | 'plain';
  logo?: string | null;
  /** Etiketin altında "N ürün" (üreticiler). */
  count?: number;
  children?: CategoryTileData[];
  /** Alt kategorisi olan kutuda: üst kategorinin KENDİ listesi (alt düzeydeki "Tümü" kutusu). */
  allHref?: string;
}

export interface CategoryGroup {
  key: CategoryGroupKey;
  title: string;
  tiles: CategoryTileData[];
  /** Izgaranın altındaki bağlantı (ör. "Tüm üreticiler"). */
  footer?: { label: string; href: string };
}

/** Web `NAV_MANUFACTURER_LIMIT`: menü bir "en popülerler" vitrini; tam liste ayrı ekranda. */
export const CATEGORIES_MANUFACTURER_LIMIT = 40;

/** Hedef adresler — web `navHref` ile aynı parametre adları (mobil `/listings` bunları okur). */
export const catalogHref = {
  allListings: '/listings',
  newArrivals: '/listings?sortBy=created_desc',
  bestSellers: '/listings?sortBy=view_count_desc',
  onSale: '/listings?discountOnly=true',
  collections: '/collections',
  allManufacturers: '/ureticiler',
  category: (cat: { id: string; name: string }) =>
    `/listings?categoryId=${encodeURIComponent(cat.id)}&category=${encodeURIComponent(cat.name)}`,
  manufacturer: (m: { id: string; name: string }) =>
    `/listings?manufacturer=${encodeURIComponent(m.name)}&manufacturerId=${encodeURIComponent(m.id)}`,
  scale: (scale: string) => `/listings?scale=${encodeURIComponent(scale)}`,
} as const;

/** Keşfet grubu: web kategori çubuğunun sabit öğeleri (Üreticiler/Kategoriler/Ölçek kendi gruplarıdır). */
export function buildExploreTiles(t: TFunction): CategoryTileData[] {
  const plain = (id: string, labelKey: MessageKey, href: string): CategoryTileData => ({
    id: `explore:${id}`,
    label: t(labelKey),
    href,
    visual: 'plain',
  });
  return [
    plain('all', 'nav.allListings', catalogHref.allListings),
    plain('new', 'nav.newArrivals', catalogHref.newArrivals),
    plain('best', 'nav.bestSellers', catalogHref.bestSellers),
    plain('sale', 'nav.onSale', catalogHref.onSale),
    plain('collections', 'nav.collections', catalogHref.collections),
  ];
}

/** Bu düğüm ve altındaki tüm aktif ilanların toplamı (`productCount` doğrudan sayıdır). */
function subtreeCount(node: CategoryNode): number {
  return (
    (node.productCount ?? 0) + (node.children ?? []).reduce((sum, child) => sum + subtreeCount(child), 0)
  );
}

/**
 * Kategori ağacı → kutular. İlanı olmayan (kendisi ve altı) kategori gösterilmez — boş listeye
 * götüren kutu kullanıcıyı yanıltır (üretici/marka listeleriyle aynı karar). Sayaç alanı hiç
 * gelmemişse (eski yanıt biçimi) süzme yapılmaz. Alt kategorisi olan kutu alt düzeye iner.
 */
export function buildCategoryTiles(nodes: CategoryNode[]): CategoryTileData[] {
  const hasCounts = (list: CategoryNode[]): boolean =>
    list.some((n) => n.productCount != null || hasCounts(n.children ?? []));
  const filterEmpty = hasCounts(nodes);
  const build = (list: CategoryNode[]): CategoryTileData[] =>
    list
      .filter((n) => !filterEmpty || subtreeCount(n) > 0)
      .map((n) => {
        const children = build(n.children ?? []);
        return {
          id: `category:${n.id}`,
          label: n.name,
          visual: 'logo' as const,
          ...(children.length > 0
            ? { children, allHref: catalogHref.category(n) }
            : { href: catalogHref.category(n) }),
        };
      });
  return build(nodes);
}

/**
 * Üreticiler: ilanı olanlar, ilan sayısına göre azalan (eşitlikte ada göre), en çok `limit` tane
 * (web `popularManufacturers`).
 */
export function buildManufacturerTiles(
  list: ManufacturerNode[],
  limit: number = CATEGORIES_MANUFACTURER_LIMIT,
): CategoryTileData[] {
  return list
    .map((m) => ({ m, count: listingCount(m) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || a.m.name.localeCompare(b.m.name))
    .slice(0, limit)
    .map(({ m, count }) => ({
      id: `manufacturer:${m.id}`,
      label: m.name,
      href: catalogHref.manufacturer(m),
      visual: 'logo' as const,
      logo: m.logo ?? null,
      count,
    }));
}

export function buildScaleTiles(scales: string[]): CategoryTileData[] {
  return scales
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .map((scale) => ({
      id: `scale:${scale}`,
      label: scale,
      href: catalogHref.scale(scale),
      visual: 'plain' as const,
    }));
}

/**
 * Raydaki gruplar: Keşfet (sabit) → Kategoriler → Üreticiler → Ölçek. Verisi olmayan grup gizlenir.
 */
export function buildGroups(
  t: TFunction,
  data: { categories: CategoryNode[]; manufacturers: ManufacturerNode[]; scales: string[] },
): CategoryGroup[] {
  const groups: CategoryGroup[] = [
    { key: 'explore', title: t('nav.explore'), tiles: buildExploreTiles(t) },
    { key: 'categories', title: t('nav.categories'), tiles: buildCategoryTiles(data.categories) },
    {
      key: 'manufacturers',
      title: t('nav.manufacturers'),
      tiles: buildManufacturerTiles(data.manufacturers),
      footer: { label: t('nav.allManufacturers'), href: catalogHref.allManufacturers },
    },
    { key: 'scales', title: t('nav.scale'), tiles: buildScaleTiles(data.scales) },
  ];
  return groups.filter((g) => g.tiles.length > 0);
}
