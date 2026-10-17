import { api } from './client';
import { apiPath } from './path';

/**
 * İlan kaldırma nedeni — silme (`DELETE` gövdesi) ve pasife alma (`PATCH`)
 * isteklerine eklenir. Alanlar API'de opsiyoneldir (eski istemci nedensiz de
 * çalışır) ama web gibi mobil de nedeni ZORUNLU sorar. Bkz. tarodan-app
 * `docs/LISTING_REMOVAL_REASONS.md`.
 */
export interface ListingRemovalPayload {
  removalReason?: string;
  removalPlatform?: string;
  removalDetail?: string;
}

// Products API - Web ile aynı endpoint'ler
export const productsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/products', { params }),
  /** Popüler ilanlar (görüntülenmeye göre) — backend: GET /products/popular */
  getPopular: (params?: { limit?: number; page?: number }) =>
    api.get('/products/popular', { params }),
  /** Dinamik filtre seçenekleri — web SidebarFilters ile aynı kaynak. Backend: GET /products/filters */
  getFilters: (params?: { manufacturer?: string }) =>
    api.get<{
      categories: Array<{ value: string; label: string; slug: string; parentId: string | null }>;
      brands: Array<{ id: string; name: string; slug: string }>;
      carModels: Array<{ id: string; name: string; slug: string; brandId: string }>;
      scales: string[];
      manufacturers: Array<{ id: string; name: string; slug: string }>;
      materials: Array<{ slug: string; label: string }>;
      // Genel gruplar (manufacturerSlug null) her zaman; üreticiye bağlılar (örn Hot Wheels)
      // yalnız `manufacturer` verilince eklenir.
      customAttributes?: Array<{
        slug: string;
        name: string;
        manufacturerSlug: string | null;
        attributes: Array<{ slug: string; label: string; color: string | null }>;
      }>;
    }>('/products/filters', { params }),
  getOne: (id: string | number) =>
    api.get(apiPath`/products/${id}`),
  /** Görüntülenme sayacını artır — web ile parite (POST /products/:id/view). Ekran başına 1 kez çağrılmalı. */
  incrementView: (id: string | number) =>
    api.post(apiPath`/products/${id}/view`),
  /** İlan kartı tıklama sayacını artır — web ile parite (POST /products/:id/click).
   *  Fire-and-forget: hata navigasyonu engellememeli. */
  recordClick: (id: string | number) =>
    api.post(apiPath`/products/${id}/click`),
  create: (data: Record<string, any>) =>
    api.post('/products', data),
  update: (id: string | number, data: Record<string, any>) =>
    api.patch(apiPath`/products/${id}`, data),
  /** İlanı sil; kaldırma nedeni istek GÖVDESİNDE gider (DELETE + body). */
  delete: (id: string | number, removal?: ListingRemovalPayload) =>
    api.delete(apiPath`/products/${id}`, removal ? { data: removal } : undefined),
  /** İlanı pasife al (satıcı duraklatması) — kaldırma nedeniyle birlikte. */
  deactivate: (id: string | number, removal: ListingRemovalPayload) =>
    api.patch(apiPath`/products/${id}`, { status: 'inactive', ...removal }),
  /** Süresi dolan tek ilanı yenile: içerik değişmediyse doğrudan `active`, aksi hâlde `pending`.
   *  Backend: POST /products/:id/renew → `{ id, status }`. */
  renew: (id: string) => api.post(apiPath`/products/${id}/renew`),
  /** Süresi dolan ilanları toplu yenile (en çok 100). Her ilan KENDİ sonucuyla döner (201 gövdesinde
   *  `ok:false` + `errorKey` olabilir — HTTP hatası değildir). Backend: POST /products/my/renew. */
  renewMany: (ids: string[]) => api.post('/products/my/renew', { ids }),
  /** Backend: GET /products/my (web ile aynı). Daha önce farklı bir "my listings" ucu kullanılıyordu — backend'de yok. */
  getMyListings: (params?: Record<string, any>) =>
    api.get('/products/my', { params }),
  /** İlanlarım istatistikleri (aktif, satıldı, görüntülenme vb.) */
  getMyStats: () => api.get('/products/my/stats'),
  /** Mevcut sahibinin ilanı — düzenleme için */
  getMyById: (id: string) => api.get(apiPath`/products/my/${id}`),
  /** Aynı kategoriden benzer ürünler — backend: GET /products/:id/similar */
  getSimilar: (id: string, limit = 12) =>
    api.get(apiPath`/products/${id}/similar`, { params: { limit } }),
  // ---- Boost / Öne Çıkarma ----
  /** Boost süre/fiyat paketleri. Backend: GET /products/boost/pricing */
  getBoostPricing: () =>
    api.get<{
      enabled?: boolean;
      options?: Array<{ durationDays: number; price: number; label: string }>;
    }>('/products/boost/pricing'),
  /** İlan için paket + süre + fiyat seçenekleri (web BoostModal ile aynı kaynak).
   *  Backend: GET /products/:id/boost/options — yeni paket modeli; boost/pricing eski düz-fiyat. */
  getBoostOptions: (productId: string) =>
    api.get<{
      packages?: Array<{
        id: string;
        name: string;
        durations: Array<{ durationDays: number; price: number }>;
      }>;
      options?: Array<{ durationDays: number; price: number; label: string }>;
    }>(apiPath`/products/${productId}/boost/options`),
  /** Kullanıcının boost'ları (en yeni önce). Backend: GET /products/boost/my */
  getMyBoosts: () => api.get('/products/boost/my'),
  /** İlanı öne çıkar — ödeme başlat (paymentId döner). Backend: POST /products/:id/boost/initiate */
  initiateBoost: (
    productId: string,
    data: { durationDays: number; packageId?: string; autoRenew?: boolean; provider?: 'paytr' },
  ) => api.post(apiPath`/products/${productId}/boost/initiate`, data),
};

// Search API - Elasticsearch ile gerçek arama
export const searchApi = {
  // Elasticsearch ile ürün arama
  products: (params?: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  }) => api.get('/search/products', { params }),

  // Autocomplete önerileri (basit)
  autocomplete: (query: string) =>
    api.get('/search/autocomplete', { params: { q: query } }),

  /** Zenginleştirilmiş autocomplete: products + brands + categories + manufacturers + scales + suggestions */
  autocompleteRich: (query: string) =>
    api.get<{
      products: Array<{ id: string; title: string; imageUrl?: string; price: number; brandName?: string }>;
      brands: Array<{ id: string; name: string; slug: string; logo?: string | null }>;
      categories: Array<{ id: string; name: string; slug: string }>;
      manufacturers: Array<{ id: string; name: string; slug: string; logo?: string | null }>;
      carModels?: Array<{ id: string; name: string; slug: string; brandId: string }>;
      scales?: string[];
      materials?: Array<{ slug: string; label: string }>;
      conditions?: Array<{ value: string; label: string }>;
      suggestions: string[];
    }>('/search/autocomplete-rich', { params: { q: query } }),

  // İsimle satıcı arama (autocomplete)
  users: (query: string, limit?: number) =>
    api.get<Array<{ id: string; displayName: string; avatarUrl?: string; isVerified?: boolean; totalListings?: number }>>(
      '/users/search',
      { params: { q: query, limit } },
    ),
};

/** Markalar (örn. Porsche, Ferrari) */
export const brandsApi = {
  findAll: () => api.get('/brands'),
  /** Backend'de yalnızca slug ile detay var (GET /brands/:slug) — id ile çağrı 404 döner. */
  findBySlug: (slug: string) => api.get(apiPath`/brands/${slug}`),
};

/** Üreticiler / producers (örn. Hot Wheels, Bburago) */
export const manufacturersApi = {
  findAll: () => api.get('/manufacturers'),
  findOne: (id: string) => api.get(apiPath`/manufacturers/${id}`),
  findBySlug: (slug: string) => api.get(apiPath`/manufacturers/slug/${slug}`),
};

// Car Models API — backend: /car-models (web ile aynı)
export const carModelsApi = {
  findAll: (params?: { brandId?: string; brandSlug?: string }) =>
    api.get('/car-models', { params }),
  /** Backend'de yalnızca slug ile detay var (GET /car-models/:slug) — id ile çağrı 404 döner. */
  findBySlug: (slug: string) => api.get(apiPath`/car-models/${slug}`),
};
