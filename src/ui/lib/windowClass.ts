import { useWindowDimensions, type DimensionValue } from 'react-native';
import { theme } from './theme';

const { breakpoints, contentWidths } = theme;

/**
 * Large-screen layout rules: ONE classifier for widths, one column-count rule for card grids and
 * one readable content width. Every rule is a no-op below `breakpoints.medium` (600 pt), so phone
 * layouts are unchanged. Inputs are measured widths (window or component), never device models.
 */

export type WindowClass = 'compact' | 'medium' | 'expanded' | 'large';

/** Width class of a measured width (pt), see `src/theme/breakpoints.ts`. */
export function windowClassOf(width: number): WindowClass {
  if (width >= breakpoints.large) return 'large';
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}

/** Width class of the current window; re-renders on rotation, fold/unfold and window resizes. */
export function useWindowClass(): WindowClass {
  return windowClassOf(useWindowDimensions().width);
}

/** Column count per width class. */
export type GridColumnSpec = Readonly<Record<WindowClass, number>>;

/**
 * Card grids (listing, collection, model cards): web listings `grid-cols-2 sm:grid-cols-3
 * lg:grid-cols-4`, plus a fifth column for landscape tablets.
 */
export const CARD_GRID_COLUMNS: GridColumnSpec = { compact: 2, medium: 3, expanded: 4, large: 5 };

/** Column count for a grid driven by `width` (pt). */
export function gridColumns(width: number, spec: GridColumnSpec = CARD_GRID_COLUMNS): number {
  return spec[windowClassOf(width)];
}

/**
 * Column count for a grid that spans the window. A `FlatList` / `FlashList` cannot change
 * `numColumns` in place: put the count in its `key`.
 */
export function useGridColumns(spec: GridColumnSpec = CARD_GRID_COLUMNS): number {
  return gridColumns(useWindowDimensions().width, spec);
}

/**
 * Width (pt) of one cell in a `columns`-column grid whose content box is `contentWidth` wide, with
 * `gap` pt between columns. A fixed cell width keeps a short last row at the same width as full
 * rows (a `flex: 1` cell would stretch across the empty columns).
 */
export function gridCellWidth(contentWidth: number, columns: number, gap: number): number {
  const cols = Math.max(1, Math.floor(columns));
  return Math.max(0, (contentWidth - gap * (cols - 1)) / cols);
}

/** Percentages kept to 4 decimals, so a full row never sums past 100% and wraps early. */
const toPercent = (value: number): DimensionValue => `${Math.floor(value * 10000) / 10000}%`;

/** Default column gap of percentage grids (% of the row): two columns = the 48% cards. */
export const GRID_GAP_PERCENT = 4;

/**
 * Cell style of a `flexDirection: 'row', flexWrap: 'wrap'` grid laid out in percentages: each cell
 * is `(100 - gap * (columns - 1)) / columns` % wide, and every cell but the first of its row has a
 * `gapPercent` % left margin. Two columns with a 4% gap give exactly the `width: '48%'` +
 * `space-between` geometry; unlike `space-between`, a short last row stays left-aligned.
 */
export function gridCellStyle(
  index: number,
  columns: number,
  gapPercent: number = GRID_GAP_PERCENT,
): { width: DimensionValue; marginLeft: DimensionValue } {
  const cols = Math.max(1, Math.floor(columns));
  return {
    width: toPercent((100 - gapPercent * (cols - 1)) / cols),
    marginLeft: index % cols === 0 ? 0 : toPercent(gapPercent),
  };
}

/**
 * Side padding that keeps content at most `maxWidth` wide and centred in a `width`-wide container,
 * but never less than `gutter`. Phones get `gutter` itself.
 */
export function readableGutter(width: number, gutter: number, maxWidth: number = contentWidths.readable): number {
  return Math.max(gutter, Math.round((width - maxWidth) / 2));
}

/** `readableGutter` for content that spans the window. */
export function useReadableGutter(gutter: number, maxWidth: number = contentWidths.readable): number {
  return readableGutter(useWindowDimensions().width, gutter, maxWidth);
}
