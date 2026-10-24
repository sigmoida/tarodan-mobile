/**
 * PageShell on large screens: `scroll` and `list` bodies are readable by default (672 pt, centred),
 * `contentWidth="full"` and `static` span the window minus the gutter, the footer bar content is
 * capped. A `list` page's own list takes the width through `useReadableContentStyle`. Phones are
 * unchanged (the page gutter only).
 */
import React from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { PageShell, RawText, pageListContentStyle, theme, useReadableContentStyle, type PageShellContentWidth } from '@/ui';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const contentStyle = () => StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle);
const footerContent = () => StyleSheet.flatten(screen.getByTestId('page-shell-footer').children[0]!.props.style);

describe('PageShell content width', () => {
  afterEach(() => setWindow(375, 667));

  it('phone: the body keeps the 16 pt gutter', () => {
    setWindow(390, 844);
    render(
      <PageShell title="Form">
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(contentStyle().paddingHorizontal).toBe(theme.spacing[4]);
  });

  it('foldable inner display (626 pt): still the gutter (672 + gutters does not fit)', () => {
    setWindow(626, 890);
    render(
      <PageShell title="Form">
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(contentStyle().paddingHorizontal).toBe(theme.spacing[4]);
  });

  it.each([
    [820, 1180],
    [1032, 1376],
  ])('tablet %d pt: the scroll body is centred at the readable width', (width, height) => {
    setWindow(width, height);
    render(
      <PageShell title="Form">
        <RawText>body</RawText>
      </PageShell>,
    );
    const pad = contentStyle().paddingHorizontal as number;
    expect(width - 2 * pad).toBe(theme.contentWidths.readable);
  });

  it('tablet: contentWidth="full" keeps the gutter (grid pages)', () => {
    setWindow(1032, 1376);
    render(
      <PageShell title="Grid" contentWidth="full">
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(contentStyle().paddingHorizontal).toBe(theme.spacing[4]);
  });

  it('tablet: a static body is full width by default and readable on request', () => {
    setWindow(1032, 1376);
    const view = render(
      <PageShell title="S" mode="static" testID="ps">
        <RawText>body</RawText>
      </PageShell>,
    );
    // The static body is the nearest ancestor of the child that carries the body padding.
    const staticBody = () => {
      let node = screen.getByText('body').parent;
      while (node && StyleSheet.flatten(node.props.style)?.padding === undefined) node = node.parent;
      return StyleSheet.flatten(node!.props.style);
    };
    expect(staticBody().paddingHorizontal).toBe(theme.spacing[4]);
    view.rerender(
      <PageShell title="S" mode="static" contentWidth="readable" testID="ps">
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(staticBody().paddingHorizontal).toBe((1032 - theme.contentWidths.readable) / 2);
  });

  it('tablet: the default loading skeleton takes the readable width too (no jump)', () => {
    jest.useFakeTimers();
    setWindow(1032, 1376);
    render(
      <PageShell title="Form" loading>
        <RawText>body</RawText>
      </PageShell>,
    );
    act(() => void jest.advanceTimersByTime(theme.loading.delayMs + 10));
    const style = StyleSheet.flatten(screen.getByTestId('page-shell-skeleton').props.style);
    expect(style.paddingHorizontal).toBe((1032 - theme.contentWidths.readable) / 2);
    jest.useRealTimers();
  });

  it('the footer content is capped at the readable width and centred', () => {
    setWindow(1032, 1376);
    render(
      <PageShell title="Form" footer={<RawText>Save</RawText>}>
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(footerContent()).toMatchObject({ maxWidth: theme.contentWidths.readable, alignSelf: 'center', width: '100%' });
  });
});

/** A `mode="list"` screen as the row lists write it: the shell's width and the list's padding. */
function ListScreen({ contentWidth, loading }: { contentWidth?: PageShellContentWidth; loading?: boolean }) {
  const readableStyle = useReadableContentStyle(pageListContentStyle);
  return (
    <PageShell title="List" mode="list" contentWidth={contentWidth} loading={loading}>
      <FlatList
        data={['a']}
        renderItem={({ item }) => <RawText>{item}</RawText>}
        contentContainerStyle={contentWidth === 'full' ? pageListContentStyle : readableStyle}
      />
    </PageShell>
  );
}

describe('PageShell list mode width', () => {
  // Unmount before restoring the window: a resize re-renders a mounted screen outside act().
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });
  const listPad = () => {
    const flat = StyleSheet.flatten(screen.UNSAFE_getByType(FlatList).props.contentContainerStyle);
    return flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
  };
  const skeletonPad = () => {
    act(() => void jest.advanceTimersByTime(theme.loading.delayMs + 10));
    return StyleSheet.flatten(screen.getByTestId('page-shell-skeleton').props.style).paddingHorizontal;
  };

  it.each([
    [390, 844, theme.spacing[4]],
    [820, 1180, (820 - theme.contentWidths.readable) / 2],
    [1032, 1376, (1032 - theme.contentWidths.readable) / 2],
  ])('readable row list at %d pt: list padding %d', (width, height, pad) => {
    setWindow(width, height);
    render(<ListScreen />);
    expect(listPad()).toBe(pad);
  });

  it.each([
    [390, 844],
    [820, 1180],
    [1032, 1376],
  ])('full grid list at %d pt: the page gutter only', (width, height) => {
    setWindow(width, height);
    render(<ListScreen contentWidth="full" />);
    expect(listPad()).toBe(theme.spacing[4]);
  });

  it('the list body itself is not narrowed (the side margins scroll)', () => {
    setWindow(1032, 1376);
    render(<ListScreen />);
    let node = screen.UNSAFE_getByType(FlatList).parent;
    while (node) {
      const st = StyleSheet.flatten(node.props.style) ?? {};
      expect(st.paddingHorizontal ?? 0).toBe(0);
      expect(st.maxWidth).toBeUndefined();
      node = node.parent;
    }
  });

  it.each([
    [390, undefined, theme.spacing[4]],
    [820, undefined, (820 - theme.contentWidths.readable) / 2],
    [1032, undefined, (1032 - theme.contentWidths.readable) / 2],
    [1032, 'full' as const, theme.spacing[4]],
  ])('list-mode skeleton at %d pt (contentWidth %s) matches the list width', (width, contentWidth, pad) => {
    jest.useFakeTimers();
    setWindow(width, 1200);
    render(<ListScreen contentWidth={contentWidth} loading />);
    expect(skeletonPad()).toBe(pad);
    jest.useRealTimers();
  });
});
