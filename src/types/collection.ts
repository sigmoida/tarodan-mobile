// Vendored response shape of tarodan-app `CollectionItemResponseDto` (apps/api collection module,
// development eb63df603); the source moves to `packages/types/src/collection.ts` (hub plan
// 2026-11-06-collection-custom-items, task A1). Re-vendor byte for byte once it lands there.

/**
 * One item of `GET /collections/:id` `items[]`: a marketplace listing, or a custom item (a model
 * the owner entered by hand, `isCustom: true`) that is not a listing and has no price.
 */
export interface CollectionItemSummary {
  id: string;
  /** Absent on a custom item. */
  productId?: string;
  productTitle: string;
  productImage?: string;
  /** Absent on a custom item: it is not for sale. Never show it as 0. */
  productPrice?: number;
  productStatus?: string;
  /** The listing's seller; null on a custom item. */
  sellerId?: string | null;
  sortOrder: number;
  isFeatured: boolean;
  /** The listing's own boost is active (not a featured item inside the collection). */
  isBoosted?: boolean;
  addedAt: string;
  /** Always set by the API: true for a custom item, false for a listing. */
  isCustom: boolean;
  customTitle?: string;
  customDescription?: string;
  customBrand?: string;
  customModel?: string;
  customYear?: number;
  customScale?: string;
  customManufacturer?: string;
  customMaterial?: string;
  customImageUrl?: string;
}
