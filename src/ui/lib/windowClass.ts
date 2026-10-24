import { StyleSheet, useWindowDimensions, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from './theme';
import { PAGE_GUTTER } from './pageLayout';

const { breakpoints } = theme;

/**
 * Large-screen layout rules: ONE classifier for widths, one column-count rule per grid kind and one
 * page gutter. Every screen goes edge to edge; layouts re-proportion by width class instead of
 * centring a narrow column. Every rule is a no-op below `breakpoints.medium` (600 pt), so phone
 * layouts are unchanged. Inputs are measured widths (window or component), never device models.
 */

export type WindowClass = 'compact' | 'medium' | 'expanded' | 'large';

/** Width class of a measured width (pt), see `src/theme/breakpoints.ts`. */
export function windowClassOf(width: number): WindowClass {
  if (width >= breakpoints.large) return 'large';
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}

const CLASS_ORDER: readonly WindowClass[] = ['compact', 'medium', 'expanded', 'large'];

/** Whether `cls` is `min` or wider: THE ordered comparison of width classes (`'expanded'` and up, ...). */
export function isAtLeast(cls: WindowClass, min: WindowClass): boolean {
  return CLASS_ORDER.indexOf(cls) >= CLASS_ORDER.indexOf(min);
}

/** Width class of the current window; re-renders on rotation, fold/unfold and window resizes. */
export function useWindowClass(): WindowClass {
  return windowClassOf(useWindowDimensions().width);
}

/** Column count per width class. */
export type GridColumnSpec = Readonly<Record<WindowClass, number>>;

/**
 * Card grids (listing, collection, model cards): web listings `grid-cols-2 sm:grid-cols-3
 * lg:grid-cols-4`, plus a fifth column for landscape tablets.
 */
export const CARD_GRID_COLUMNS: GridColumnSpec = { compact: 2, medium: 3, expanded: 4, large: 5 };

/** Column count for a grid driven by `width` (pt). */
export function gridColumns(width: number, spec: GridColumnSpec = CARD_GRID_COLUMNS): number {
  return spec[windowClassOf(width)];
}

/**
 * Column count for a grid that spans the window. A `FlatList` / `FlashList` cannot change
 * `numColumns` in place: put the count in its `key`.
 */
export function useGridColumns(spec: GridColumnSpec = CARD_GRID_COLUMNS): number {
  return gridColumns(useWindowDimensions().width, spec);
}

/**
 * Width (pt) of one cell in a `columns`-column grid whose content box is `contentWidth` wide, with
 * `gap` pt between columns. A fixed cell width keeps a short last row at the same width as full
 * rows (a `flex: 1` cell would stretch across the empty columns).
 */
export function gridCellWidth(contentWidth: number, columns: number, gap: number): number {
  const cols = Math.max(1, Math.floor(columns));
  return Math.max(0, (contentWidth - gap * (cols - 1)) / cols);
}

/** Percentages kept to 4 decimals, so a full row never sums past 100% and wraps early. */
const toPercent = (value: number): DimensionValue => `${Math.floor(value * 10000) / 10000}%`;

/** Default column gap of percentage grids (% of the row): two columns = the 48% cards. */
export const GRID_GAP_PERCENT = 4;

/**
 * Cell style of a `flexDirection: 'row', flexWrap: 'wrap'` grid laid out in percentages: each cell
 * is `(100 - gap * (columns - 1)) / columns` % wide, and every cell but the first of its row has a
 * `gapPercent` % left margin. Two columns with a 4% gap give exactly the `width: '48%'` +
 * `space-between` geometry; unlike `space-between`, a short last row stays left-aligned.
 */
export function gridCellStyle(
  index: number,
  columns: number,
  gapPercent: number = GRID_GAP_PERCENT,
): { width: DimensionValue; marginLeft: DimensionValue } {
  const cols = Math.max(1, Math.floor(columns));
  return {
    width: toPercent((100 - gapPercent * (cols - 1)) / cols),
    marginLeft: index % cols === 0 ? 0 : toPercent(gapPercent),
  };
}

/**
 * Side gutter of page content per width class: phones keep the 16 pt page gutter (`PAGE_GUTTER`),
 * tablets get a wider one so an edge-to-edge layout does not hug the screen edge.
 */
export const PAGE_GUTTERS: GridColumnSpec = {
  compact: PAGE_GUTTER,
  medium: theme.spacing[6],
  expanded: theme.spacing[8],
  large: theme.spacing[8],
};

/**
 * Page gutter (pt) for content that spans a `width`-wide window: THE side padding of every shell,
 * list, footer and floating bar on large screens. `PAGE_GUTTER` on phones.
 */
export function pageGutter(width: number): number {
  return PAGE_GUTTERS[windowClassOf(width)];
}

/** `pageGutter` of the current window. */
export function usePageGutter(): number {
  return pageGutter(useWindowDimensions().width);
}

/**
 * A side padding of `own` pt widened to the tablet gutter: phones get `own` back, tablets
 * `max(own, pageGutter)`. A deliberate full-bleed side (0) stays 0 (inbox rows, the product
 * gallery), as does a non-numeric one.
 */
export function tabletSidePadding<T>(own: T, width: number): T | number {
  if (typeof own !== 'number' || own <= 0 || windowClassOf(width) === 'compact') return own;
  return Math.max(own, pageGutter(width));
}

/**
 * `base` (the `contentContainerStyle` of a list or ScrollView) with its side padding widened to the
 * tablet gutter (`tabletSidePadding`). Each side's own padding is `paddingLeft` / `paddingRight`,
 * else `paddingHorizontal`, else `padding`, else 0. On phones, or when nothing changes, `base`
 * comes back as it is (the same object), so phone layouts stay pixel-identical.
 */
export function pageContentStyle(base: StyleProp<ViewStyle>, width: number): StyleProp<ViewStyle> {
  if (windowClassOf(width) === 'compact') return base;
  const flat = StyleSheet.flatten(base) ?? {};
  const shared = flat.paddingHorizontal ?? flat.padding ?? 0;
  const left = flat.paddingLeft ?? shared;
  const right = flat.paddingRight ?? shared;
  const nextLeft = tabletSidePadding(left, width);
  const nextRight = tabletSidePadding(right, width);
  if (nextLeft === left && nextRight === right) return base;
  return [base, { paddingLeft: nextLeft as number, paddingRight: nextRight as number }];
}

/**
 * `pageContentStyle` for a list or ScrollView that spans the window: the lists of
 * `PageShell mode="list"` and the tab roots (`AppShell`), whose shells cannot pad a child's scroll
 * content themselves.
 */
export function usePageContentStyle(base: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return pageContentStyle(base, useWindowDimensions().width);
}

/**
 * Row lists (orders, sales, offers, my listings, ...) as a card grid on large screens: one column on
 * phones, 2 on medium, 3 on expanded and 4 on large windows (each card keeps roughly its phone
 * width, ~300-480 pt, instead of stretching).
 */
export const ROW_CARD_COLUMNS: GridColumnSpec = { compact: 1, medium: 2, expanded: 3, large: 4 };

/** Column gap of the row card grid (% of the row; ~16-20 pt on tablets). */
export const ROW_GRID_GAP_PERCENT = 2;
