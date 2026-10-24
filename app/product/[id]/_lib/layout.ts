import { useWindowDimensions } from 'react-native';
import { SCROLL_EDGE_FULL_AT, pageGutter, theme, windowClassOf } from '@/ui';

/**
 * Product detail layout by window width — ONE source for the gallery square, the screen layout, the
 * buy bar arrangement and the top bar's scroll threshold. A hook (not a module-level
 * `Dimensions.get`): rotation, fold/unfold and split view update them together.
 *
 * - `compact` (phones): the gallery is an edge-to-edge square of the window width (unchanged), the
 *   buy bar stacks the offer / trade row above price + buttons.
 * - `medium` and up (foldable iPhone inner, iPad portrait and landscape, tablets): `split`: the
 *   content width (window minus the page gutters) splits into two equal columns `SPLIT_COLUMN_GAP`
 *   apart: the gallery square on the left, the title / price / description / seller column on the
 *   right; the specs cards below (side by side, the same gap) line up with these two columns, then
 *   reviews and similar listings run full width. The buy bar is one row: the price on the left, the offer / trade buttons and the
 *   buy buttons on the right at their natural width (`wideBar`, `offerTrade: 'inline'`).
 */

/** Gap between the two split columns; the same gap as the specs cards below them (`ProductSpecs`). */
export const SPLIT_COLUMN_GAP = theme.spacing[4];

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
    // Half of the content width: the square is the left column, aligned with the cards below.
    gallerySide: Math.floor((windowWidth - 2 * pageGutter(windowWidth) - SPLIT_COLUMN_GAP) / 2),
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
