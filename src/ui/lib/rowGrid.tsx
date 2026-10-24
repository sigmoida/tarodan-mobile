import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { ROW_CARD_COLUMNS, ROW_GRID_GAP_PERCENT, gridCellStyle, gridColumns, type GridColumnSpec } from './windowClass';

export interface RowGrid {
  /** The list's `key`: a `FlatList` cannot change `numColumns` in place, so it re-mounts on a change. */
  listKey: string;
  /** Column count, the `FlatList`'s `numColumns` (1 on phones, the `FlatList` default). */
  numColumns: number;
  /**
   * Wraps a rendered card in its grid cell (`gridCellStyle`: percentage width + left gap, a short
   * last row stays left-aligned). One column: the card comes back as it is (phones unchanged).
   */
  cell: (index: number, card: React.ReactElement) => React.ReactElement;
}

/**
 * Row lists (orders, sales, offers, my listings, favourites, ...) as a card grid on large screens:
 * columns from `ROW_CARD_COLUMNS` (1 / 2 / 3 / 4), the shared `gridCellStyle` geometry with a
 * `ROW_GRID_GAP_PERCENT` gap. Rows keep their vertical gap from the list's `contentContainerStyle`
 * `gap`. Usage:
 *
 * ```tsx
 * const grid = useRowGrid();
 * const renderItem = useCallback(({ item, index }) => grid.cell(index, <OrderCard order={item} />), [grid]);
 * <FlatList key={grid.listKey} numColumns={grid.numColumns} renderItem={renderItem} ... />
 * ```
 */
export function useRowGrid(spec: GridColumnSpec = ROW_CARD_COLUMNS): RowGrid {
  const columns = gridColumns(useWindowDimensions().width, spec);
  return React.useMemo(
    () => ({
      listKey: `row-grid-${columns}`,
      numColumns: columns,
      cell: (index, card) =>
        columns === 1 ? card : <View style={gridCellStyle(index, columns, ROW_GRID_GAP_PERCENT)}>{card}</View>,
    }),
    [columns],
  );
}
