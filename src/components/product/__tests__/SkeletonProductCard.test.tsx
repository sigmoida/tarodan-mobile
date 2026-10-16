/** Ürün kartı iskeleti: kartla aynı geometri (PRODUCT_CARD_METRICS) ve gerçek ızgara hücre genişliği. */
import React from 'react';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { PAGE_GUTTER, theme } from '@/ui';
import { PRODUCT_CARD_METRICS as PM } from '../ProductCard';
import { SkeletonProductCard } from '../SkeletonProductCard';
import { PRODUCT_GRID_GAP, ProductGridSkeleton } from '../ProductListStates';
import { SkeletonMenuRow } from '../../menu/SkeletonMenuRow';
import { PROFILE_ROW_METRICS } from '../../menu/ProfileRow';

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe('SkeletonProductCard', () => {
  it('grid: kart çerçevesi (kenarlık + ürün kartı köşesi)', () => {
    render(<SkeletonProductCard testID="g" />);
    expect(flat('g')).toMatchObject({
      borderWidth: PM.borderWidth,
      borderRadius: PM.grid.radius,
      backgroundColor: theme.colors.surface.elevated,
    });
  });

  it('list: kart dolgusu, aralığı ve köşesi', () => {
    render(<SkeletonProductCard testID="l" layout="list" />);
    expect(flat('l')).toMatchObject({ padding: PM.list.padding, gap: PM.list.gap, borderRadius: PM.list.radius });
  });

  it('ProductGridSkeleton: hücre genişliği gerçek ızgarayla aynı (useProductCellWidth)', () => {
    render(<ProductGridSkeleton count={2} />);
    const grid = screen.getByTestId('product-grid-skeleton');
    expect(StyleSheet.flatten(grid.props.style).gap).toBe(PRODUCT_GRID_GAP);
    // Hücre = (pencere genişliği − 2×gutter − aralık) / 2.
    const { width } = Dimensions.get('window');
    const cell = StyleSheet.flatten((grid.children[0] as { props: { style: StyleProp<ViewStyle> } }).props.style);
    expect(cell.width).toBe((width - PAGE_GUTTER * 2 - PRODUCT_GRID_GAP) / 2);
  });
});

describe('SkeletonMenuRow', () => {
  it('ProfileRow ile aynı satır yüksekliği/dolgusu (flat + card)', () => {
    render(
      <>
        <SkeletonMenuRow testID="f" />
        <SkeletonMenuRow testID="c" variant="card" />
      </>,
    );
    expect(flat('f')).toMatchObject(PROFILE_ROW_METRICS.flat);
    expect(flat('c')).toMatchObject(PROFILE_ROW_METRICS.card);
  });
});
