import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { theme } from '../theme';
import {
  CARD_GRID_COLUMNS,
  gridCellStyle,
  gridCellWidth,
  gridColumns,
  readableGutter,
  useGridColumns,
  useReadableGutter,
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

describe('readableGutter', () => {
  it('returns the gutter on phones and the foldable iPhone', () => {
    for (const w of [375, 430, 626, 700]) expect(readableGutter(w, 16)).toBe(16);
  });

  it('centres the readable width on tablets', () => {
    expect(readableGutter(820, 16)).toBe(74);
    expect(readableGutter(1032, 16)).toBe(180);
    expect(820 - 2 * readableGutter(820, 16)).toBe(theme.contentWidths.readable);
  });

  it('takes a custom max width and a zero gutter', () => {
    expect(readableGutter(1000, 0, 600)).toBe(200);
    expect(readableGutter(500, 0, 600)).toBe(0);
  });
});

describe('hooks follow the window', () => {
  afterEach(() => setWindow(375, 667));

  it('useWindowClass, useGridColumns and useReadableGutter at phone, iPad and Duo widths', () => {
    const cases: Array<[number, number, string, number, number]> = [
      [390, 844, 'compact', 2, 16],
      [626, 890, 'medium', 3, 16],
      [820, 1180, 'medium', 3, 74],
      [1032, 1376, 'expanded', 4, 180],
    ];
    for (const [w, h, cls, cols, gutter] of cases) {
      setWindow(w, h);
      expect(renderHook(() => useWindowClass()).result.current).toBe(cls);
      expect(renderHook(() => useGridColumns()).result.current).toBe(cols);
      expect(renderHook(() => useReadableGutter(16)).result.current).toBe(gutter);
    }
  });
});
