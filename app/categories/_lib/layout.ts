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

/** Width of the left rail as a share of the screen (narrow vertical group list); the skeleton uses it too. */
export const CATEGORY_RAIL_WIDTH = '30%';
