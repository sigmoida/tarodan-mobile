/**
 * Product detail layout by window width: gallery square, split layout and the top bar threshold all
 * come from `productDetailLayout`, so they stay in sync on rotation and fold/unfold.
 */
import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SCROLL_EDGE_FULL_AT } from '@/ui';
import { pageGutter } from '@/ui';
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
    [626, 257, 'inline'],
    [820, 345, 'inline'], // iPad Air 11" portrait: one-row bar
    [1032, 432, 'inline'],
    [1180, 499, 'inline'], // iPad Air 11" landscape: everything in one row
    [1366, 582, 'inline'],
  ] as const)('%d pt: gallery column at 45%%, square %d pt inside the gutter, wide bar, offer / trade %s', (w, side, offerTrade) => {
    expect(productDetailLayout(w)).toEqual({ split: true, gallerySide: side, wideBar: true, offerTrade });
    expect(side).toBe(Math.floor(w * GALLERY_SPLIT_FRACTION) - pageGutter(w));
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
  const inside = (text: string, testID: string) => {
    const target = screen.getByTestId(testID);
    let node = screen.getByText(text).parent;
    while (node && node !== target) node = node.parent;
    return node === target;
  };
  const tree = (
    <ProductBodyLayout
      gallery={<Text>gallery</Text>}
      head={<Text>head</Text>}
      description={<Text>description</Text>}
      rest={<Text>rest</Text>}
      specs={<Text>specs</Text>}
      below={<Text>below</Text>}
    />
  );

  it('phone (390 pt): gallery, then one column in the phone order', () => {
    setWindow(390, 844);
    render(tree);
    expect(screen.queryByTestId('product-split-layout')).toBeNull();
    const column = columnOf('head');
    for (const block of ['description', 'rest', 'specs', 'below']) expect(columnOf(block)).toBe(column);
  });

  it.each([
    [820, 345, 24],
    [1180, 499, 32],
  ])('iPad %d pt: gallery %d pt inset by the %d pt gutter under the top bar; head, description, rest beside it; specs and below full width', (w, side, gutter) => {
    setWindow(w, 1000);
    render(tree);
    const galleryColumn = StyleSheet.flatten(screen.getByTestId('product-gallery-column').props.style);
    expect(galleryColumn.width).toBe(side + gutter);
    expect(galleryColumn.paddingLeft).toBe(gutter);
    expect(galleryColumn.paddingTop).toBeGreaterThan(0);
    const info = screen.getByTestId('product-info-column');
    expect(StyleSheet.flatten(info.props.style).paddingTop).toBe(galleryColumn.paddingTop);
    expect(StyleSheet.flatten(info.props.style).paddingHorizontal).toBe(gutter);
    for (const block of ['head', 'description', 'rest']) expect([block, inside(block, 'product-info-column')]).toEqual([block, true]);
    for (const block of ['specs', 'below']) {
      expect([block, inside(block, 'product-info-column')]).toEqual([block, false]);
      expect([block, inside(block, 'product-below')]).toEqual([block, true]);
    }
    expect(StyleSheet.flatten(screen.getByTestId('product-below').props.style).paddingHorizontal).toBe(gutter);
  });
});
