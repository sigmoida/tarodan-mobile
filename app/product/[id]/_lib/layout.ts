import { useWindowDimensions } from 'react-native';
import { SCROLL_EDGE_FULL_AT, windowClassOf } from '@/ui';

/**
 * Product detail layout by window width — ONE source for the gallery square, the screen layout and
 * the top bar's scroll threshold. A hook (not a module-level `Dimensions.get`): rotation, fold/unfold
 * and split view update the gallery and the threshold together.
 *
 * - `compact` (phones): the gallery is an edge-to-edge square of the window width (unchanged).
 * - `medium` (foldable iPhone inner, iPad Air 11" portrait): the square is capped at
 *   `GALLERY_MAX_SIDE` and centred, so it no longer fills ~70% of the screen.
 * - `expanded` and up (iPad 13" portrait, landscape tablets): `split`: the gallery (half the window,
 *   at most `GALLERY_SPLIT_MAX_SIDE`) sits beside the title / price / seller column.
 */

/** Largest gallery square above the info (pt), `medium` windows. */
export const GALLERY_MAX_SIDE = 480;
/** Largest gallery square beside the info column (pt), `expanded` and wider windows. */
export const GALLERY_SPLIT_MAX_SIDE = 560;

export interface ProductDetailLayout {
  /** Gallery beside the info column (true) or above it. */
  split: boolean;
  /** Side of the gallery square (pt). */
  gallerySide: number;
}

export function productDetailLayout(windowWidth: number): ProductDetailLayout {
  const windowClass = windowClassOf(windowWidth);
  if (windowClass === 'compact') return { split: false, gallerySide: windowWidth };
  if (windowClass === 'medium') return { split: false, gallerySide: Math.min(windowWidth, GALLERY_MAX_SIDE) };
  return { split: true, gallerySide: Math.min(Math.floor(windowWidth / 2), GALLERY_SPLIT_MAX_SIDE) };
}

export function useProductDetailLayout(): ProductDetailLayout {
  return productDetailLayout(useWindowDimensions().width);
}

/** Side of the gallery square (pt) for the current window. */
export function useGallerySize(): number {
  return useProductDetailLayout().gallerySide;
}

/**
 * Scroll offset to subtract before feeding the top bar's `ScrollEdge`. Gallery above the info: the
 * gallery runs up under the bar, so the edge completes when the gallery's end reaches the bar (not
 * at 0; the photo is not washed out). Gallery beside the info: the info column starts under the bar
 * like any page, so the edge follows the scroll from 0.
 */
export function topBarEdgeShift({ split, gallerySide }: ProductDetailLayout, barHeight: number): number {
  return split ? 0 : gallerySide - barHeight - SCROLL_EDGE_FULL_AT;
}
