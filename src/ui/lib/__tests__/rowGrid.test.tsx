/**
 * Row lists as card grids on large screens (`useRowGrid`): 1 / 2 / 3 / 4 columns by window class,
 * the shared `gridCellStyle` geometry, the list key follows the count, phones get the card back.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import { useRowGrid } from '../rowGrid';
import { ROW_GRID_GAP_PERCENT, gridCellStyle } from '../windowClass';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

describe('useRowGrid', () => {
  afterEach(() => setWindow(375, 667));

  it.each([
    [390, 844, 1],
    [820, 1180, 2],
    [1032, 1376, 3],
    [1180, 820, 3],
    [1366, 1024, 4],
  ])('%d pt -> %d columns, keyed by the count', (w, h, columns) => {
    setWindow(w, h);
    const { result } = renderHook(() => useRowGrid());
    expect(result.current.columns).toBe(columns);
    expect(result.current.numColumns).toBe(columns);
    expect(result.current.listKey).toBe(`row-grid-${columns}`);
  });

  it('phones: the card comes back unwrapped (pixel-identical)', () => {
    setWindow(390, 844);
    const { result } = renderHook(() => useRowGrid());
    const card = <Text>card</Text>;
    expect(result.current.cell(3, card)).toBe(card);
  });

  it('tablets: each card sits in a gridCellStyle cell', () => {
    setWindow(1032, 1376);
    const { result } = renderHook(() => useRowGrid());
    render(result.current.cell(4, <Text>card</Text>));
    let node = screen.getByText('card').parent;
    while (node && StyleSheet.flatten(node.props.style)?.width === undefined) node = node.parent;
    expect(StyleSheet.flatten(node!.props.style)).toEqual(gridCellStyle(4, 3, ROW_GRID_GAP_PERCENT));
  });
});

describe('row list screens use the row grid', () => {
  const ROOT = path.resolve(__dirname, '../../../..');
  it.each([
    'app/orders/index.tsx',
    'app/sales/index.tsx',
    'app/offers/index.tsx',
    'app/trades.tsx',
    'app/following.tsx',
    'app/settings/my-listings/index.tsx',
    'app/settings/blocked-users/index.tsx',
    'app/settings/payment-history/index.tsx',
    'app/settings/discounts/index.tsx',
    'app/settings/discounts/products.tsx',
    'app/(tabs)/favorites/index.tsx',
    'app/ureticiler/index.tsx',
  ])('%s', (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    expect(src).toMatch(/useRowGrid\(\)/);
    expect(src).toMatch(/key=\{grid\.listKey\}/);
    expect(src).toMatch(/numColumns=\{grid\.numColumns\}/);
    expect(src).toMatch(/grid\.cell\(/);
  });
});
