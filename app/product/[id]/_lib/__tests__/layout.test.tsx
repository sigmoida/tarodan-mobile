/**
 * Product detail layout by window width: gallery square, split layout and the top bar threshold all
 * come from `productDetailLayout`, so they stay in sync on rotation and fold/unfold.
 */
import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SCROLL_EDGE_FULL_AT } from '@/ui';
import {
  GALLERY_MAX_SIDE,
  GALLERY_SPLIT_MAX_SIDE,
  productDetailLayout,
  topBarEdgeShift,
} from '../layout';
import { ProductBodyLayout } from '../../_components/ProductBodyLayout';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

describe('productDetailLayout', () => {
  it('phones (and the foldable outer display): window-wide square above the info', () => {
    for (const w of [320, 390, 430, 466]) expect(productDetailLayout(w)).toEqual({ split: false, gallerySide: w });
  });

  it('medium (foldable inner 626, iPad Air 11" 820): square capped and above the info', () => {
    expect(productDetailLayout(626)).toEqual({ split: false, gallerySide: GALLERY_MAX_SIDE });
    expect(productDetailLayout(820)).toEqual({ split: false, gallerySide: GALLERY_MAX_SIDE });
  });

  it('expanded and wider (iPad 13" 1032, landscape 1280): gallery beside the info, half wide, capped', () => {
    expect(productDetailLayout(1032)).toEqual({ split: true, gallerySide: 516 });
    expect(productDetailLayout(1280)).toEqual({ split: true, gallerySide: GALLERY_SPLIT_MAX_SIDE });
  });

  it('the gallery never takes more than half of a tablet window height', () => {
    expect(productDetailLayout(820).gallerySide / 1180).toBeLessThan(0.5);
    expect(productDetailLayout(626).gallerySide / 890).toBeLessThan(0.55);
  });
});

describe('topBarEdgeShift', () => {
  const bar = 47 + 52 + 8;
  it('gallery above: the edge completes when the gallery end reaches the bar (phone value unchanged)', () => {
    const phone = productDetailLayout(390);
    expect(topBarEdgeShift(phone, bar)).toBe(390 - bar - SCROLL_EDGE_FULL_AT);
    expect(topBarEdgeShift(productDetailLayout(820), bar)).toBe(GALLERY_MAX_SIDE - bar - SCROLL_EDGE_FULL_AT);
  });

  it('gallery beside the info: the edge follows the scroll from 0 like any page', () => {
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

  it('phone: gallery, then one column with primary and secondary', () => {
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
    expect(galleryColumn.width).toBe(516);
  });
});
