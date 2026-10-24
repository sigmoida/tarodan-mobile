/**
 * FAB `placement="bottomRight"` — alt menünün "+" (İlan Ver) düğmesiyle AYNI çap, sağ kenar ve alt
 * uzaklık (tek kaynak `lib/floating`); içerik boşluğu da bu çaptan türer.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import { FAB } from '../FAB';
import {
  FAB_SIZE_SM,
  FLOATING_ACTION_SIZE,
  FLOATING_SIDE_GAP,
  floatingBottomOffset,
  useFabContentInset,
} from '../../lib/floating';
import { theme } from '../../lib/theme';
import { TAB_PILL_HEIGHT, TAB_PILL_SIDE_GAP, tabPillBottomOffset } from '@/components/shell/tabBarLayout';

function fabStyle() {
  const style = screen.getByTestId('fab').props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
}

describe('FAB bottomRight', () => {
  it('alt menü hapıyla aynı yükseklik, sağ kenar ve alt uzaklık', () => {
    render(<FAB testID="fab" icon="plus" accessibilityLabel="Yeni" placement="bottomRight" />);
    const f = fabStyle();
    expect(f.position).toBe('absolute');
    expect(f.height).toBe(TAB_PILL_HEIGHT);
    expect(f.minWidth).toBe(TAB_PILL_HEIGHT);
    expect(f.right).toBe(TAB_PILL_SIDE_GAP);
    // Test ortamında güvenli alan 0 → hap ile aynı formül.
    expect(f.bottom).toBe(tabPillBottomOffset(0));
    expect(f.bottom).toBe(floatingBottomOffset(0));
  });

  it('ikincil FAB (size verilmiş) küçük kalır, konumu aynı', () => {
    render(<FAB testID="fab" icon="chevron-up" size="sm" accessibilityLabel="Yukarı" placement="bottomRight" />);
    const f = fabStyle();
    expect(f.height).toBe(FAB_SIZE_SM);
    expect(f.right).toBe(TAB_PILL_SIDE_GAP);
    expect(f.bottom).toBe(tabPillBottomOffset(0));
  });

  it('satır içi FAB kendi boyutunu korur', () => {
    render(<FAB testID="fab" icon="plus" size="sm" accessibilityLabel="Yeni" />);
    const f = fabStyle();
    expect(f.height).toBe(FAB_SIZE_SM);
    expect(f.position).toBeUndefined();
  });

  it('tek kaynak: alt menü ve FAB sabitleri aynı', () => {
    expect(TAB_PILL_HEIGHT).toBe(FLOATING_ACTION_SIZE);
    expect(TAB_PILL_SIDE_GAP).toBe(FLOATING_SIDE_GAP);
  });

  it('içerik boşluğu = alt uzaklık + FAB çapı + nefes payı', () => {
    const { result } = renderHook(() => useFabContentInset());
    expect(result.current).toBe(floatingBottomOffset(0) + FLOATING_ACTION_SIZE + theme.spacing[2]);
    const sm = renderHook(() => useFabContentInset(FAB_SIZE_SM));
    expect(sm.result.current).toBe(floatingBottomOffset(0) + FAB_SIZE_SM + theme.spacing[2]);
  });
});

describe('FAB bottomRight on large screens', () => {
  const setWindow = (width: number, height: number) =>
    Dimensions.set({
      window: { width, height, scale: 2, fontScale: 2 },
      screen: { width, height, scale: 2, fontScale: 2 },
    });
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });

  it.each([
    [390, FLOATING_SIDE_GAP],
    [820, theme.spacing[6]],
    [1032, theme.spacing[8]],
  ])('%d pt: right %d (the page gutter)', (width, right) => {
    setWindow(width, 1200);
    render(<FAB testID="fab" icon="plus" accessibilityLabel="Yeni" placement="bottomRight" />);
    expect(fabStyle().right).toBe(right);
  });
});
