// Ürün detay görüntüleme yardımcıları — durum rengi, görsel çözümleme, stok.
import { transformImageUrl, IMAGE_PLACEHOLDER } from '@/utils/imageUrl';
import {
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
} from '@/utils/productPrice';
import { getProductSalePercent } from '@/components/product/productCardBadges';
import type { Product } from './types';

export interface PriceInfo {
  effectivePrice: number;
  onSale: boolean;
  originalPrice: number;
  discountPct: number;
}

const PLACEHOLDER = IMAGE_PLACEHOLDER;

/** İndirim/fiyat gösterimi — ProductCard ile aynı kural. (DTO gevşek olduğundan
 * paylaşılan util'lere `any` ile geçilir; sıkılaştırma Faz 4.) */
export function getProductPriceInfo(product: Product): PriceInfo {
  const p = product as any;
  return {
    effectivePrice: getProductEffectivePrice(p),
    onSale: isProductOnSaleDisplay(p),
    originalPrice: getProductOriginalPriceForDisplay(p),
    discountPct: getProductSalePercent(p),
  };
}

/** Görsel URL'lerini çöz (cardUrl/detailUrl/url) — yoksa placeholder. */
export function resolveProductImages(product: Product): any[] {
  return product?.images && product.images.length > 0
    ? product.images.map((img: any) => {
        const uri = transformImageUrl(img, 'detail'); // galeri: tam çözünürlük (varsayılan card)
        return typeof img === 'string' ? uri : { ...img, url: uri };
      })
    : [PLACEHOLDER];
}

/** Stokta yok: active dışı statü veya müsait adet 0 (null = sınırsız stok → stokta). */
export function isProductOutOfStock(product: Product): boolean {
  return (
    (product.status != null && product.status !== 'active') ||
    (product.availableQuantity != null && product.availableQuantity <= 0)
  );
}
