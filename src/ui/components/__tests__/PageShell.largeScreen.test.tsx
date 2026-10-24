/**
 * PageShell on large screens: every body goes edge to edge; the side padding becomes the tablet
 * gutter (`pageGutter`: 24 pt medium, 32 pt expanded+), the footer bar spans the window with the
 * same gutter, nothing is capped or centred. Phones are unchanged (the page gutter only).
 */
import React from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { PageShell, RawText, pageListContentStyle, theme, usePageContentStyle } from '@/ui';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const contentStyle = () => StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle);
const footer = () => StyleSheet.flatten(screen.getByTestId('page-shell-footer').props.style);
const footerContent = () => StyleSheet.flatten(screen.getByTestId('page-shell-footer').children[0]!.props.style);

const GUTTERS: Array<[number, number, number]> = [
  [390, 844, theme.spacing[4]],
  [626, 890, theme.spacing[6]],
  [820, 1180, theme.spacing[6]],
  [1032, 1376, theme.spacing[8]],
  [1180, 820, theme.spacing[8]],
];

describe('PageShell width', () => {
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });

  it.each(GUTTERS)('%d pt: the scroll body side padding is the page gutter', (width, height, gutter) => {
    setWindow(width, height);
    render(
      <PageShell title="Form">
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(contentStyle().paddingHorizontal).toBe(gutter);
    expect(contentStyle().maxWidth).toBeUndefined();
  });

  it('tablet: padding={false} stays full bleed', () => {
    setWindow(1032, 1376);
    render(
      <PageShell title="Media" padding={false}>
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(contentStyle().paddingHorizontal).toBe(0);
  });

  it('tablet: a static body takes the gutter too', () => {
    setWindow(1032, 1376);
    render(
      <PageShell title="S" mode="static">
        <RawText>body</RawText>
      </PageShell>,
    );
    let node = screen.getByText('body').parent;
    while (node && StyleSheet.flatten(node.props.style)?.padding === undefined) node = node.parent;
    expect(StyleSheet.flatten(node!.props.style).paddingHorizontal).toBe(theme.spacing[8]);
  });

  it('tablet: the default loading skeleton takes the same gutter (no jump)', () => {
    jest.useFakeTimers();
    setWindow(1032, 1376);
    render(
      <PageShell title="Form" loading>
        <RawText>body</RawText>
      </PageShell>,
    );
    act(() => void jest.advanceTimersByTime(theme.loading.delayMs + 10));
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-skeleton').props.style).paddingHorizontal).toBe(
      theme.spacing[8],
    );
    jest.useRealTimers();
  });

  it.each(GUTTERS)('%d pt: the footer spans the window with the page gutter, uncapped', (width, height, gutter) => {
    setWindow(width, height);
    render(
      <PageShell title="Form" footer={<RawText>Save</RawText>}>
        <RawText>body</RawText>
      </PageShell>,
    );
    expect(footer().paddingHorizontal).toBe(gutter);
    expect(footerContent().maxWidth).toBeUndefined();
    expect(footerContent().alignSelf).toBeUndefined();
  });
});

/** A `mode="list"` screen as the lists write it. */
function ListScreen({ loading }: { loading?: boolean }) {
  const style = usePageContentStyle(pageListContentStyle);
  return (
    <PageShell title="List" mode="list" loading={loading}>
      <FlatList data={['a']} renderItem={({ item }) => <RawText>{item}</RawText>} contentContainerStyle={style} />
    </PageShell>
  );
}

describe('PageShell list mode width', () => {
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });
  const listPad = () => {
    const flat = StyleSheet.flatten(screen.UNSAFE_getByType(FlatList).props.contentContainerStyle);
    return flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
  };

  it.each(GUTTERS)('list at %d pt: list padding is the page gutter', (width, height, gutter) => {
    setWindow(width, height);
    render(<ListScreen />);
    expect(listPad()).toBe(gutter);
  });

  it('the list body itself is not narrowed', () => {
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

  it.each(GUTTERS)('list-mode skeleton at %d pt matches the list gutter', (width, height, gutter) => {
    jest.useFakeTimers();
    setWindow(width, height);
    render(<ListScreen loading />);
    act(() => void jest.advanceTimersByTime(theme.loading.delayMs + 10));
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-skeleton').props.style).paddingHorizontal).toBe(gutter);
    jest.useRealTimers();
  });
});
