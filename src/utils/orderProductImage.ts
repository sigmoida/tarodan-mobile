import { transformImageUrl, getImageUrl, IMAGE_PLACEHOLDER, type ImageVariant } from './imageUrl';

/** API formatOrderResponse: product.imageUrl veya images dizisi */
export function getOrderProductImageUri(
  product: {
    imageUrl?: string | null;
    images?: unknown;
  } | null | undefined,
  variant: ImageVariant = 'detail',
): string {
  if (!product) return IMAGE_PLACEHOLDER;
  if (product.imageUrl && typeof product.imageUrl === 'string') {
    return transformImageUrl(product.imageUrl, variant);
  }
  return getImageUrl(product.images, variant);
}
