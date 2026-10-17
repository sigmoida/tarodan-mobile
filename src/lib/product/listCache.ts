import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import type { ProductDetailData } from './detailQuery';

/**
 * Ürün kartı taşıyan liste önbelleklerinin prefix kökleri: anasayfa rayları / öne çıkanlar / popüler
 * (`products`), arama, ilanlar, kategori, benzer ürünler (`product`, id, `similar`), favoriler, satıcı,
 * marka / üretici / model ürünleri, ilanlarım. Detay ekranının ilk karesi ve beğeni sayısı yaması
 * bu köklerde aranır — yeni bir ürün listesi anahtarı eklenirse buraya da eklenmeli.
 */
export const PRODUCT_LIST_ROOTS: readonly QueryKey[] = [
  qk.products.all,
  qk.products.searchAll,
  qk.products.categoryProductsAll,
  qk.products.detailAll,
  qk.products.myListingsAll,
  qk.favorites.all,
  qk.seller.productsAll,
  qk.catalog.brandProductsAll,
  qk.catalog.manufacturerProductsAll,
  qk.catalog.modelProductsAll,
];

/** Sayfa / sarmal / iç içe `product` derinliği: `{ pages: [{ data: [item] }] }` = 4, favori `item.product` = 3. */
const MAX_DEPTH = 6;

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Kart DTO'su mu: aranan id + başlık + fiyat (yorum/koleksiyon gibi aynı id'li başka nesneler elenir). */
const isProductEntry = (value: unknown, productId: string): value is AnyRecord =>
  isRecord(value) &&
  value.id != null &&
  String(value.id) === productId &&
  typeof value.title === 'string' &&
  value.price != null;

const sameKey = (a: QueryKey, b: QueryKey) => a.length === b.length && a.every((part, i) => part === b[i]);

function findInTree(value: unknown, productId: string, depth: number): AnyRecord | undefined {
  if (depth > MAX_DEPTH || !value || typeof value !== 'object') return undefined;
  if (isProductEntry(value, productId)) return value;
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const hit = findInTree(child, productId, depth + 1);
    if (hit) return hit;
  }
  return undefined;
}

/** Yapısal paylaşımlı eşleme: değişmeyen dal aynı referans kalır (React Query yalnız değişeni bildirir). */
function mapTree(value: unknown, productId: string, fn: (p: AnyRecord) => AnyRecord, depth: number): unknown {
  if (depth > MAX_DEPTH || !value || typeof value !== 'object') return value;
  if (isProductEntry(value, productId)) return fn(value);
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((child) => {
      const mapped = mapTree(child, productId, fn, depth + 1);
      if (mapped !== child) changed = true;
      return mapped;
    });
    return changed ? next : value;
  }
  if (!isRecord(value)) return value;
  let next: AnyRecord | null = null;
  for (const [key, child] of Object.entries(value)) {
    const mapped = mapTree(child, productId, fn, depth + 1);
    if (mapped !== child) {
      next = next ?? { ...value };
      next[key] = mapped;
    }
  }
  return next ?? value;
}

/** Kartın da bildiği alanlar — detay ekranının ilk karesi (başlık / fiyat / galeri / satıcı özeti). */
const CARD_FIELDS = [
  'id',
  'title',
  'price',
  'oldPrice',
  'originalPrice',
  'salePrice',
  'isOnSale',
  'discountPercent',
  'images',
  'status',
  'availableQuantity',
  'quantity',
  'tradeAvailable',
  'isTradeEnabled',
  'viewCount',
  'likeCount',
  'sellerId',
  'seller',
] as const;

/**
 * Önbellekteki herhangi bir ürün listesinde bu ürünün kartı varsa yalnız kart alanlarından bir detay
 * yer tutucusu üretir (React Query `placeholderData`): ekran ağ beklemeden başlık / fiyat / galeriyle
 * açılır, tam veri gelince yerine geçer. Yer tutucu önbelleğe YAZILMAZ. Yoksa `undefined`.
 */
export function findCachedListProduct(queryClient: QueryClient, productId: string): ProductDetailData | undefined {
  if (!productId) return undefined;
  const detailKey = qk.products.detail(productId);
  for (const root of PRODUCT_LIST_ROOTS) {
    for (const [key, data] of queryClient.getQueriesData({ queryKey: root })) {
      if (sameKey(key, detailKey)) continue;
      const hit = findInTree(data, productId, 0);
      if (!hit) continue;
      const seed: AnyRecord = {};
      for (const field of CARD_FIELDS) if (hit[field] !== undefined) seed[field] = hit[field];
      const images = Array.isArray(hit.images) ? hit.images : [];
      if (images.length === 0 && typeof hit.imageUrl === 'string' && hit.imageUrl) seed.images = [hit.imageUrl];
      seed.id = productId;
      return seed as ProductDetailData;
    }
  }
  return undefined;
}

/**
 * Ürünün listelerdeki kartlarını yerinde güncelle (ör. beğeni sayısı ±1) — listeleri invalidate edip
 * bağlı rayları / aramayı yeniden çekmek yerine. Detay önbelleği (`qk.products.detail`) hariç: onu
 * çağıran ayrıca yönetir.
 */
export function patchCachedListProduct(
  queryClient: QueryClient,
  productId: string,
  fn: (product: AnyRecord) => AnyRecord,
): void {
  if (!productId) return;
  const detailKey = qk.products.detail(productId);
  for (const root of PRODUCT_LIST_ROOTS) {
    for (const [key, data] of queryClient.getQueriesData({ queryKey: root })) {
      if (data === undefined || sameKey(key, detailKey)) continue;
      const next = mapTree(data, productId, fn, 0);
      if (next !== data) queryClient.setQueryData(key, next);
    }
  }
}
