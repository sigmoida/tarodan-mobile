// ---------------------------------------------------------------------------
// ListingForm — route-local DTO / prop types
// ---------------------------------------------------------------------------
export interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface CarModel {
  id: string;
  name: string;
  slug: string;
  brand?: { slug: string };
}

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
}

export interface MaterialOption {
  slug: string;
  label: string;
}

export interface ListingLimits {
  currentCount: number;
  maxListings: number;
  canCreateListing: boolean;
  isPremium: boolean;
  membershipTier: string;
  remainingListings: number;
}

export interface CommissionPreview {
  sellerFeeAmount: number;
  sellerNetAmount: number;
}

export type AttrGroup = {
  slug: string;
  name: string;
  manufacturerSlug: string | null;
  isRequired: boolean;
  attributes: Array<{ slug: string; label: string; color?: string | null }>;
};

export interface ListingFormProps {
  /** create → POST /products, edit → PATCH /products/:id */
  mode: 'create' | 'edit';
  /** Required when mode === 'edit'. */
  productId?: string;
}

// ---------------------------------------------------------------------------
// GET /products/my/:id — iki projeksiyon
// ---------------------------------------------------------------------------

/** Sunucunun tanıdığı görsel kimliği. İstemci ÜRETMEZ, URL'den çıkarmaz. */
export interface ImageKey {
  cardKey: string;
  detailKey: string;
}

export interface EditImage extends ImageKey {
  cardUrl: string;
  detailUrl: string;
  sortOrder: number;
}

export interface EditAttribute {
  groupSlug: string;
  groupName: string | null;
  slug: string;
  value: string | null;
  displayValue: string | null;
  /** `null` = üretici-bağımsız nitelik (ör. `scale`). Bunlar da forma girer. */
  manufacturerSlug: string | null;
}

/**
 * Kayda GERİ YAZILABİLİR ham değerler (delta 18 §2c). Form yalnız buradan
 * doldurulur — üst seviye alanlar gösterim içindir ve geri yazılamaz.
 *
 * `isPreorder` ve `availableQuantity` bu blokta YOKTUR (2026-08-10 ölçümü);
 * o ikisi üst seviyeden okunur.
 */
export interface EditProjection {
  title: string | null;
  description: string | null;
  price: number | null;
  oldPrice: number | null;
  salePrice: number | null;
  saleStartDate: string | null;
  saleEndDate: string | null;
  categoryId: string | null;
  brandId: string | null;
  carModelId: string | null;
  manufacturerId: string | null;
  condition: string | null;
  status: string | null;
  modelCode: string | null;
  color: string | null;
  isBoxed: boolean | null;
  quantity: number | null;
  maxQuantityPerOrder: number | null;
  shippingPackageTier: 'small' | 'medium' | 'large';
  isTradeEnabled: boolean;
  isSet: boolean;
  bundleSize: number | null;
  isLimited: boolean;
  editionNumber: string | null;
  editionTotal: number | null;
  releaseDate: string | null;
  year: number | null;
  images: EditImage[];
  attributes: EditAttribute[];
  /** Kolaylık etiketleri — dokümanda yok, ölçümde var. Liste yüklenmeden gösterilir. */
  categoryName?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  carModelName?: string | null;
  manufacturerName?: string | null;
  manufacturerSlug?: string | null;
}

export interface MyProductResponse {
  edit?: EditProjection;
  /** `edit`'te YOK — üst seviyeden okunur. */
  isPreorder?: boolean;
  /** `edit`'te YOK — rezerve adet hesabı için üst seviyeden okunur. */
  availableQuantity?: number | null;
  quantity?: number | null;
  [key: string]: unknown;
}
