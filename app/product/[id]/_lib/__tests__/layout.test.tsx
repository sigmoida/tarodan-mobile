/**
 * Product detail layout by window width: gallery square, split layout and the top bar threshold all
 * come from `productDetailLayout`, so they stay in sync on rotation and fold/unfold.
 */
import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SCROLL_EDGE_FULL_AT } from '@/ui';
import { GALLERY_SPLIT_FRACTION, productDetailLayout, topBarEdgeShift } from '../layout';
import { ProductBodyLayout } from '../../_components/ProductBodyLayout';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

describe('productDetailLayout', () => {
  it('phones (and the foldable outer display): window-wide square above the info, stacked bar', () => {
    for (const w of [320, 390, 430, 466]) {
      expect(productDetailLayout(w)).toEqual({ split: false, gallerySide: w, wideBar: false, offerTrade: 'stacked' });
    }
  });

  it.each([
    [626, 281, 'above'],
    [820, 369, 'above'], // iPad Air 11" portrait: offer / trade above the bar
    [1032, 464, 'inline'],
    [1180, 531, 'inline'], // iPad Air 11" landscape: everything in one row
    [1366, 614, 'inline'],
  ] as const)('%d pt: gallery beside the info at 45%% (%d pt), wide bar, offer / trade %s', (w, side, offerTrade) => {
    expect(productDetailLayout(w)).toEqual({ split: true, gallerySide: side, wideBar: true, offerTrade });
    expect(side).toBe(Math.floor(w * GALLERY_SPLIT_FRACTION));
  });

  it('the landscape gallery fits the window height (1180 x 820)', () => {
    expect(productDetailLayout(1180).gallerySide).toBeLessThan(820);
  });
});

describe('topBarEdgeShift', () => {
  const bar = 47 + 52 + 8;
  it('gallery above (phones): the edge completes when the gallery end reaches the bar', () => {
    expect(topBarEdgeShift(productDetailLayout(390), bar)).toBe(390 - bar - SCROLL_EDGE_FULL_AT);
  });

  it('gallery beside the info (tablets): the edge follows the scroll from 0 like any page', () => {
    expect(topBarEdgeShift(productDetailLayout(820), bar)).toBe(0);
    expect(topBarEdgeShift(productDetailLayout(1032), bar)).toBe(0);
  });
});

describe('ProductBodyLayout', () => {
  afterEach(() => setWindow(375, 667));
  // Nearest ancestor that carries the body padding (the column a block lives in).
  const columnOf = (text: string) => {
    let node = screen.getByText(text).parent;
    while (node && StyleSheet.flatten(node.props.style)?.padding === undefined) node = node.parent;
    return node;
  };
  const tree = (
    <ProductBodyLayout
      gallery={<Text>gallery</Text>}
      primary={<Text>primary</Text>}
      secondary={<Text>secondary</Text>}
    />
  );

  it('phone (390 pt): gallery, then one column with primary and secondary', () => {
    setWindow(390, 844);
    render(tree);
    expect(screen.queryByTestId('product-split-layout')).toBeNull();
    expect(columnOf('primary')).toBe(columnOf('secondary'));
  });

  it('iPad 13": gallery beside the primary column, which starts under the top bar; secondary below', () => {
    setWindow(1032, 1376);
    render(tree);
    const row = screen.getByTestId('product-split-layout');
    expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row');
    const info = screen.getByTestId('product-info-column');
    expect(StyleSheet.flatten(info.props.style).paddingTop).toBeGreaterThan(0);
    expect(columnOf('secondary')).not.toBe(columnOf('primary'));
    expect(columnOf('primary')).toBe(info);
    const galleryColumn = StyleSheet.flatten(row.children[0]!.props.style);
    expect(galleryColumn.width).toBe(464);
  });

  it.each([
    [820, 369, 24],
    [1180, 531, 32],
  ])('iPad %d pt: split, gallery %d pt wide, text columns at the %d pt gutter', (w, side, gutter) => {
    setWindow(w, 1000);
    render(tree);
    const row = screen.getByTestId('product-split-layout');
    expect(StyleSheet.flatten(row.children[0]!.props.style).width).toBe(side);
    expect(StyleSheet.flatten(screen.getByTestId('product-info-column').props.style).paddingHorizontal).toBe(gutter);
    expect(StyleSheet.flatten(columnOf('secondary')!.props.style).paddingHorizontal).toBe(gutter);
  });
});
