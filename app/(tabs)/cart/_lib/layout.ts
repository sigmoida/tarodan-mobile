import { useWindowDimensions } from 'react-native';
import { isAtLeast, windowClassOf } from '@/ui';

/**
 * Cart layout by window width (layout only: amounts, gates and actions are the same in every
 * arrangement). ONE source for the screen and its tests.
 *
 * - `compact` (phones): one column, the floating checkout bar above the tab bar (unchanged).
 * - `medium` (foldable inner, iPad portrait): one full-width column; the floating bar spans the
 *   window and lays itself out for the width (total left, button right at its natural width).
 * - `expanded` and up (iPad 13" portrait, iPad landscape): two columns: the items on the left
 *   (`CART_ITEMS_FRACTION`), the order summary + checkout action in a right-hand panel with its own
 *   scroll, so the action stays visible while the items scroll. No floating bar.
 */
export const CART_ITEMS_FRACTION = 0.62;

export interface CartLayout {
  /** Items left, summary + checkout panel right. */
  twoColumn: boolean;
  /** Floating checkout bar laid out for a wide window (no stretched button). */
  wideBar: boolean;
}

export function cartLayout(windowWidth: number): CartLayout {
  const cls = windowClassOf(windowWidth);
  if (isAtLeast(cls, 'expanded')) return { twoColumn: true, wideBar: false };
  return { twoColumn: false, wideBar: cls === 'medium' };
}

export function useCartLayout(): CartLayout {
  return cartLayout(useWindowDimensions().width);
}
