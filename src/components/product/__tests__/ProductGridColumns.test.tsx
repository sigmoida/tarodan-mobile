/**
 * Listing grid columns follow the window width: 2 on phones (unchanged), 3 on the foldable iPhone's
 * inner display and iPad Air 11" portrait, 4 on iPad 13" portrait. Cell width and skeleton follow.
 */
import React from 'react';
import { Dimensions, FlatList, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { renderWithProviders as render } from '@/test-utils';
import { PAGE_GUTTER, theme } from '@/ui';
import { ProductGrid } from '../ProductGrid';
import { PRODUCT_GRID_GAP, ProductGridSkeleton, productCellWidth } from '../ProductListStates';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const items = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, title: `Item ${i}`, price: 10, images: [] }));

describe('ProductGrid columns by window width', () => {
  afterEach(() => setWindow(375, 667));

  it.each([
    [390, 844, 2],
    [626, 890, 3],
    [820, 1180, 3],
    [1032, 1376, 4],
  ])('%d pt -> %d columns', (width, height, columns) => {
    setWindow(width, height);
    render(<ProductGrid testID="grid" items={items} />);
    expect(screen.UNSAFE_getByType(FlatList).props.numColumns).toBe(columns);
  });

  it('a runtime resize (unfolding, rotation) re-lays the grid out', () => {
    setWindow(466, 678);
    render(<ProductGrid testID="grid" items={items} />);
    expect(screen.UNSAFE_getByType(FlatList).props.numColumns).toBe(2);
    act(() => setWindow(626, 890));
    expect(screen.UNSAFE_getByType(FlatList).props.numColumns).toBe(3);
    expect(screen.getAllByText(/Item/)).toHaveLength(items.length);
  });

  it('the list layout stays one column on a tablet', () => {
    setWindow(1032, 1376);
    render(<ProductGrid testID="grid" items={items} layout="list" />);
    expect(screen.UNSAFE_getByType(FlatList).props.numColumns).toBe(1);
  });

  it('productCellWidth: phone = the old two-column width; tablet deducts every gap', () => {
    expect(productCellWidth(390, 2)).toBe((390 - PAGE_GUTTER * 2 - PRODUCT_GRID_GAP) / 2);
    // Tablets deduct the wider page gutter (`pageGutter`: 32 pt on expanded windows).
    expect(productCellWidth(1032, 4)).toBe((1032 - theme.spacing[8] * 2 - PRODUCT_GRID_GAP * 3) / 4);
  });

  it('skeleton: three rows of the current column count at the real cell width', () => {
    setWindow(1032, 1376);
    render(<ProductGridSkeleton />);
    const grid = screen.getByTestId('product-grid-skeleton');
    expect(grid.children).toHaveLength(12);
    const cell = StyleSheet.flatten((grid.children[0] as { props: { style: StyleProp<ViewStyle> } }).props.style);
    expect(cell.width).toBe(productCellWidth(1032, 4));
  });

  it('skeleton on a phone keeps six cells', () => {
    render(<ProductGridSkeleton />);
    expect(screen.getByTestId('product-grid-skeleton').children).toHaveLength(6);
  });
});
