import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
import {
  EMPTY_STATE_TOP_OFFSET,
  EmptyState,
  ErrorState,
  PAGE_GUTTER,
  PageShell,
  pageListContentStyle,
  theme,
  usePageScrollHandler,
  withTopInset,
} from '@/ui';

/** SVG kökü `backgroundColor: transparent` taşır — dolu zemin arıyoruz. */
const isFilled = (c?: unknown) => !!c && c !== 'transparent';

type Node = {
  type: unknown;
  props: { style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>; contentInset?: { top?: number } };
  parent: Node | null;
};
const num = (...v: unknown[]) => (v.find((x) => typeof x === 'number') as number | undefined) ?? 0;

/**
 * Where a state's content box starts: the sum of the paddings and margins of the node and its
 * host ancestors, plus a scroll view's content container style and iOS `contentInset` (the jest
 * scroll view mock keeps both as props on the scroll host). Composite nodes are skipped (their
 * style reaches a host node, which would count it twice).
 */
function contentOffset(node: Node) {
  const box = { top: 0, left: 0, right: 0 };
  const add = (style: StyleProp<ViewStyle>) => {
    const s: ViewStyle = StyleSheet.flatten(style) ?? {};
    box.top += num(s.paddingTop, s.paddingVertical, s.padding) + num(s.marginTop, s.marginVertical, s.margin);
    box.left += num(s.paddingLeft, s.paddingHorizontal, s.padding) + num(s.marginLeft, s.marginHorizontal, s.margin);
    box.right += num(s.paddingRight, s.paddingHorizontal, s.padding) + num(s.marginRight, s.marginHorizontal, s.margin);
  };
  for (let n: Node | null = node; n; n = n.parent) {
    if (typeof n.type !== 'string') continue;
    add(n.props.style);
    add(n.props.contentContainerStyle);
    box.top += num(n.props.contentInset?.top);
  }
  return box;
}

describe('EmptyState / ErrorState (web @tarodan/ui)', () => {
  it('gri daire içinde gri ikon, başlık lg/600, açıklama sm muted', () => {
    render(<EmptyState icon="heart" title="Favori yok" subtitle="Beğendiklerin burada" />);
    const icon = screen.getByTestId('icon-heart');
    expect(icon.props.stroke).toBe(theme.colors.text.subtle);
    let circle: typeof icon | null = icon.parent;
    while (circle && !isFilled(StyleSheet.flatten(circle.props.style)?.backgroundColor)) circle = circle.parent;
    expect(StyleSheet.flatten(circle?.props.style)).toMatchObject({
      width: 64,
      height: 64,
      backgroundColor: theme.colors.surface.alt,
    });
    expect(StyleSheet.flatten(screen.getByText('Favori yok').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
    });
    expect(StyleSheet.flatten(screen.getByText('Beğendiklerin burada').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.muted,
    });
  });

  it('ikon + başlık + alt başlık her zaman çizilir; eylem opsiyonel (actionLabel + onAction)', () => {
    const onAction = jest.fn();
    const { rerender } = render(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" />);
    expect(screen.getByTestId('icon-inbox')).toBeTruthy();
    expect(screen.getByText('Açıklama')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" actionLabel="Keşfet" onAction={onAction} />);
    fireEvent.press(screen.getByText('Keşfet'));
    expect(onAction).toHaveBeenCalled();
  });

  it('yerleşim kuralı: üstten sabit ofset, yatay ortalı; dikey ortalama / flex yok', () => {
    render(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" />);
    const style = StyleSheet.flatten(screen.getByTestId('empty-state').props.style);
    expect(style).toMatchObject({ paddingTop: EMPTY_STATE_TOP_OFFSET, alignItems: 'center' });
    expect(style.justifyContent).toBeUndefined();
    expect(style.flex).toBeUndefined();
  });

  it('placement="inline": kompakt ölçüler (24/8, 48pt daire); testID override; ErrorState aynı prop', () => {
    render(
      <>
        <EmptyState placement="inline" testID="e1" icon="inbox" title="Boş" subtitle="Açıklama" />
        <ErrorState placement="inline" />
      </>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('e1').props.style)).toMatchObject({
      paddingTop: theme.spacing[6],
      paddingBottom: theme.spacing[2],
    });
    expect(StyleSheet.flatten(screen.getByTestId('error-state').props.style)).toMatchObject({
      paddingTop: theme.spacing[6],
    });
    const icon = screen.getByTestId('icon-inbox');
    let circle: typeof icon | null = icon.parent;
    while (circle && !isFilled(StyleSheet.flatten(circle.props.style)?.backgroundColor)) circle = circle.parent;
    expect(StyleSheet.flatten(circle?.props.style)).toMatchObject({ width: 48, height: 48 });
  });

  it('placement="list": a pageListContentStyle list empty state lands exactly where PageShell empty does', () => {
    const props = { icon: 'inbox' as const, title: 'Empty', subtitle: 'Description' };

    const shell = render(<PageShell title="X" empty emptyState={props} />);
    const screenBox = contentOffset(shell.getByTestId('empty-state'));
    shell.unmount();

    function ListScreen({ state }: { state: 'empty' | 'error' }) {
      const page = usePageScrollHandler();
      return (
        <PageShell title="X" mode="list" scroll={page}>
          <Animated.FlatList
            {...page.listProps}
            data={[]}
            renderItem={() => null}
            contentContainerStyle={page.contentStyle([pageListContentStyle, { paddingBottom: 99 }])}
            ListEmptyComponent={
              state === 'empty' ? <EmptyState placement="list" {...props} /> : <ErrorState placement="list" />
            }
          />
        </PageShell>
      );
    }
    const list = render(<ListScreen state="empty" />);
    expect(contentOffset(list.getByTestId('empty-state'))).toEqual(screenBox);
    list.unmount();
    const error = render(<ListScreen state="error" />);
    expect(contentOffset(error.getByTestId('error-state'))).toEqual(screenBox);
    // The pinned numbers: 64 pt below the bar inset, 16 pt from each edge.
    expect(screenBox.left).toBe(PAGE_GUTTER);
    expect(screenBox.right).toBe(PAGE_GUTTER);
  });

  it('placement="list" holds on Android too, where the bar inset is list padding', () => {
    const inset = 100;
    const listTop = StyleSheet.flatten(withTopInset(pageListContentStyle, inset, 'android')).paddingTop as number;
    render(<EmptyState placement="list" icon="inbox" title="Empty" subtitle="Description" />);
    const own = StyleSheet.flatten(screen.getByTestId('empty-state').props.style);
    expect(listTop + (own.paddingTop as number)).toBe(inset + EMPTY_STATE_TOP_OFFSET);
  });

  it('the default screen placement inside the list gutter is the old offset bug (sits lower and narrower)', () => {
    render(<EmptyState icon="inbox" title="Empty" subtitle="Description" />);
    const own = StyleSheet.flatten(screen.getByTestId('empty-state').props.style);
    expect((pageListContentStyle.padding as number) + (own.paddingTop as number)).toBe(EMPTY_STATE_TOP_OFFSET + PAGE_GUTTER);
  });

  it('ErrorState varsayılan metinler + tekrar dene', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalled();
  });
});
