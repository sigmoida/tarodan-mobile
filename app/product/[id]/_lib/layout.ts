import { useWindowDimensions } from 'react-native';
import { SCROLL_EDGE_FULL_AT, windowClassOf } from '@/ui';

/**
 * Product detail layout by window width — ONE source for the gallery square, the screen layout, the
 * buy bar arrangement and the top bar's scroll threshold. A hook (not a module-level
 * `Dimensions.get`): rotation, fold/unfold and split view update them together.
 *
 * - `compact` (phones): the gallery is an edge-to-edge square of the window width (unchanged), the
 *   buy bar stacks the offer / trade row above price + buttons.
 * - `medium` and up (foldable iPhone inner, iPad portrait and landscape, tablets): `split`: the
 *   gallery takes `GALLERY_SPLIT_FRACTION` of the window on the left with the specs and reviews
 *   under it, the title / price / description / seller column the rest; similar listings run full
 *   width below. The buy bar is one row: the price on the left, the offer / trade buttons and the
 *   buy buttons on the right at their natural width (`wideBar`, `offerTrade: 'inline'`).
 */

/** Share of the window the gallery square takes beside the info column (`medium` and wider). */
export const GALLERY_SPLIT_FRACTION = 0.45;

export interface ProductDetailLayout {
  /** Gallery beside the info column (true) or above it. */
  split: boolean;
  /** Side of the gallery square (pt). */
  gallerySide: number;
  /** Buy buttons at their natural width on the right (no stretched button). */
  wideBar: boolean;
  /**
   * Where the offer / trade buttons go: `stacked` (phones: their own row above the bar, equal
   * halves) or `inline` (medium and up: inside the buy bar row at natural width).
   */
  offerTrade: OfferTradePlacement;
}

export type OfferTradePlacement = 'stacked' | 'inline';

export function productDetailLayout(windowWidth: number): ProductDetailLayout {
  const cls = windowClassOf(windowWidth);
  if (cls === 'compact') return { split: false, gallerySide: windowWidth, wideBar: false, offerTrade: 'stacked' };
  return {
    split: true,
    gallerySide: Math.floor(windowWidth * GALLERY_SPLIT_FRACTION),
    wideBar: true,
    offerTrade: 'inline',
  };
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
