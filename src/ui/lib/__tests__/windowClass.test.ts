import { renderHook } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';
import { PAGE_GUTTER } from '../pageLayout';
import {
  CARD_GRID_COLUMNS,
  gridCellStyle,
  gridCellWidth,
  gridColumns,
  isAtLeast,
  PAGE_GUTTERS,
  ROW_CARD_COLUMNS,
  pageContentStyle,
  pageGutter,
  tabletSidePadding,
  useGridColumns,
  usePageContentStyle,
  usePageGutter,
  useWindowClass,
  windowClassOf,
} from '../windowClass';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const pct = (v: unknown) => parseFloat(String(v));

describe('windowClassOf', () => {
  it.each([
    [320, 'compact'],
    [430, 'compact'],
    [466, 'compact'], // foldable iPhone, outer display
    [599, 'compact'],
    [600, 'medium'],
    [626, 'medium'], // foldable iPhone, inner display
    [820, 'medium'], // iPad Air 11" portrait
    [839, 'medium'],
    [840, 'expanded'],
    [1032, 'expanded'], // iPad 13" portrait
    [1199, 'expanded'],
    [1200, 'large'],
    [1280, 'large'], // Android tablet landscape
  ])('%d pt -> %s', (width, expected) => {
    expect(windowClassOf(width)).toBe(expected);
  });

  it('reads its boundaries from the breakpoint tokens', () => {
    expect(windowClassOf(theme.breakpoints.medium - 1)).toBe('compact');
    expect(windowClassOf(theme.breakpoints.medium)).toBe('medium');
    expect(windowClassOf(theme.breakpoints.expanded)).toBe('expanded');
    expect(windowClassOf(theme.breakpoints.large)).toBe('large');
  });
});

describe('isAtLeast', () => {
  it('orders the classes compact < medium < expanded < large', () => {
    expect(isAtLeast('expanded', 'expanded')).toBe(true);
    expect(isAtLeast('large', 'expanded')).toBe(true);
    expect(isAtLeast('medium', 'expanded')).toBe(false);
    expect(isAtLeast('compact', 'medium')).toBe(false);
    expect(isAtLeast('compact', 'compact')).toBe(true);
  });
});

describe('gridColumns', () => {
  it('keeps two columns on every phone width', () => {
    for (const w of [320, 360, 375, 390, 430, 466, 599]) expect(gridColumns(w)).toBe(2);
  });

  it('adds columns per class (web 2 / 3 / 4, plus 5 on landscape tablets)', () => {
    expect(gridColumns(626)).toBe(3);
    expect(gridColumns(820)).toBe(3);
    expect(gridColumns(1032)).toBe(4);
    expect(gridColumns(1280)).toBe(5);
  });

  it('takes a custom spec', () => {
    const spec = { compact: 1, medium: 2, expanded: 2, large: 3 };
    expect(gridColumns(390, spec)).toBe(1);
    expect(gridColumns(820, spec)).toBe(2);
    expect(gridColumns(1300, spec)).toBe(3);
  });

  it('exports the card spec', () => {
    expect(CARD_GRID_COLUMNS).toEqual({ compact: 2, medium: 3, expanded: 4, large: 5 });
  });
});

describe('gridCellStyle', () => {
  it('two columns with a 4% gap = the old 48% + space-between geometry', () => {
    expect(gridCellStyle(0, 2, 4)).toEqual({ width: '48%', marginLeft: 0 });
    expect(gridCellStyle(1, 2, 4)).toEqual({ width: '48%', marginLeft: '4%' });
    expect(gridCellStyle(2, 2, 4)).toEqual({ width: '48%', marginLeft: 0 });
  });

  it('two columns with a 6% gap = the old 47% geometry', () => {
    expect(gridCellStyle(1, 2, 6)).toEqual({ width: '47%', marginLeft: '6%' });
  });

  it.each([3, 4, 5])('a full row of %d columns never exceeds 100%%', (cols) => {
    let total = 0;
    for (let i = 0; i < cols; i++) {
      const s = gridCellStyle(i, cols, 4);
      total += pct(s.width) + pct(s.marginLeft);
    }
    expect(total).toBeLessThanOrEqual(100);
    expect(total).toBeGreaterThan(99.99);
  });

  it('starts every row without a margin', () => {
    expect(gridCellStyle(3, 3, 4).marginLeft).toBe(0);
    expect(gridCellStyle(4, 4, 4).marginLeft).toBe(0);
    expect(gridCellStyle(5, 4, 4).marginLeft).toBe('4%');
  });
});

describe('gridCellWidth', () => {
  it('splits the content box minus the gaps', () => {
    expect(gridCellWidth(358, 2, 12)).toBe(173);
    expect(gridCellWidth(1000, 4, 12)).toBe(241);
  });
  it('one column = the whole box; never negative', () => {
    expect(gridCellWidth(300, 1, 12)).toBe(300);
    expect(gridCellWidth(10, 4, 12)).toBe(0);
  });
});

describe('pageGutter', () => {
  it('keeps the 16 pt page gutter on every phone width', () => {
    for (const w of [320, 375, 390, 430, 466, 599]) expect(pageGutter(w)).toBe(PAGE_GUTTER);
  });

  it('widens to spacing 6 on medium and spacing 8 on expanded and large windows', () => {
    expect(pageGutter(600)).toBe(theme.spacing[6]);
    expect(pageGutter(820)).toBe(24);
    expect(pageGutter(839)).toBe(24);
    expect(pageGutter(840)).toBe(theme.spacing[8]);
    expect(pageGutter(1180)).toBe(32);
    expect(pageGutter(1366)).toBe(32);
  });

  it('uses spacing tokens only', () => {
    expect(PAGE_GUTTERS).toEqual({ compact: PAGE_GUTTER, medium: theme.spacing[6], expanded: theme.spacing[8], large: theme.spacing[8] });
  });
});

describe('tabletSidePadding', () => {
  it('phones: the own padding', () => {
    expect(tabletSidePadding(16, 390)).toBe(16);
    expect(tabletSidePadding(8, 390)).toBe(8);
  });
  it('tablets: at least the gutter; a wider own padding is kept', () => {
    expect(tabletSidePadding(16, 820)).toBe(24);
    expect(tabletSidePadding(8, 1032)).toBe(32);
    expect(tabletSidePadding(40, 1032)).toBe(40);
  });
  it('a full-bleed (0) or non-numeric side stays as it is', () => {
    expect(tabletSidePadding(0, 1032)).toBe(0);
    expect(tabletSidePadding('5%', 1032)).toBe('5%');
  });
});

describe('ROW_CARD_COLUMNS', () => {
  it.each([
    [390, 1],
    [820, 2],
    [1032, 3],
    [1180, 3],
    [1366, 4],
  ])('%d pt -> %d columns', (w, cols) => {
    expect(gridColumns(w, ROW_CARD_COLUMNS)).toBe(cols);
  });
});

describe('hooks follow the window', () => {
  afterEach(() => setWindow(375, 667));

  it('useWindowClass, useGridColumns and usePageGutter at phone, iPad and foldable widths', () => {
    const cases: Array<[number, number, string, number, number]> = [
      [390, 844, 'compact', 2, 16],
      [626, 890, 'medium', 3, 24],
      [820, 1180, 'medium', 3, 24],
      [1032, 1376, 'expanded', 4, 32],
    ];
    for (const [w, h, cls, cols, gutter] of cases) {
      setWindow(w, h);
      expect(renderHook(() => useWindowClass()).result.current).toBe(cls);
      expect(renderHook(() => useGridColumns()).result.current).toBe(cols);
      expect(renderHook(() => usePageGutter()).result.current).toBe(gutter);
    }
  });
});

describe('pageContentStyle', () => {
  const base = { padding: 16, gap: 16 };
  const sides = (style: StyleProp<ViewStyle>) => {
    const flat = StyleSheet.flatten(style);
    return [flat.paddingLeft, flat.paddingRight];
  };

  it('phones: the very same style object (pixel-identical)', () => {
    for (const w of [375, 390, 430, 599]) expect(pageContentStyle(base, w)).toBe(base);
  });

  it.each([
    [626, 24],
    [820, 24],
    [1032, 32],
    [1366, 32],
  ])('tablet %d pt: the side padding becomes the tablet gutter (%d), nothing is centred', (w, gutter) => {
    const style = pageContentStyle(base, w);
    expect(sides(style)).toEqual([gutter, gutter]);
    expect(StyleSheet.flatten(style)).toMatchObject({ padding: 16, gap: 16 });
    expect(StyleSheet.flatten(style).maxWidth).toBeUndefined();
  });

  it('reads paddingLeft / paddingRight, then paddingHorizontal, then padding; keeps wider and full-bleed sides', () => {
    expect(sides(pageContentStyle([base, { paddingHorizontal: 8 }], 1032))).toEqual([32, 32]);
    expect(sides(pageContentStyle({ paddingLeft: 16, paddingRight: 48 }, 1032))).toEqual([32, 48]);
    const fullBleed = { flexGrow: 1 };
    expect(pageContentStyle(fullBleed, 1032)).toBe(fullBleed);
  });

  it('a non-numeric side padding is left alone', () => {
    const pct = { paddingHorizontal: '5%' as const };
    expect(pageContentStyle(pct, 1032)).toBe(pct);
  });

  it('usePageContentStyle follows the window', () => {
    setWindow(1032, 1376);
    expect(sides(renderHook(() => usePageContentStyle(base)).result.current)).toEqual([32, 32]);
    setWindow(375, 667);
    expect(renderHook(() => usePageContentStyle(base)).result.current).toBe(base);
  });
});
