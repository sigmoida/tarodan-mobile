import { CARD_GRID_COLUMNS, useGridColumns, type GridColumnSpec } from '@/ui';

/**
 * Columns of the right-hand tile grid per window class (tiles, skeleton and spacer cells use the same
 * count): 2 on phones, more on tablets and unfolded foldables.
 */
export const CATEGORY_GRID_COLUMNS: GridColumnSpec = CARD_GRID_COLUMNS;

/** Tile grid column count for the current window. The grid's `FlatList` key carries it. */
export function useCategoryGridColumns(): number {
  return useGridColumns(CATEGORY_GRID_COLUMNS);
}

/** Sol rayın ekran genişliğine oranı (dar dikey grup listesi); iskelet de aynısını kullanır. */
export const CATEGORY_RAIL_WIDTH = '30%';
