/**
 * Tab-root shells on large screens: the bar and the content box span the window (the child's list
 * keeps scrolling on the side margins); a readable tab root's list centres its content at the
 * readable width through `useReadableContentStyle`. Phones keep the page gutter.
 */
import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { pageListContentStyle, theme, useReadableContentStyle } from '@/ui';
import { AppShell } from '../AppShell';
import { TitleShell } from '../TitleShell';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

function ReadableList() {
  const style = useReadableContentStyle(pageListContentStyle);
  return <FlatList data={['row']} renderItem={({ item }) => <Text>{item}</Text>} contentContainerStyle={style} />;
}

const listPad = () => {
  const flat = StyleSheet.flatten(screen.UNSAFE_getByType(FlatList).props.contentContainerStyle);
  return flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
};

describe.each([
  ['TitleShell', (child: React.ReactNode) => <TitleShell title="Profil">{child}</TitleShell>],
  ['AppShell title', (child: React.ReactNode) => <AppShell variant="title" title="Sepetim">{child}</AppShell>],
])('%s width', (_name, shell) => {
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });

  it.each([
    [390, theme.spacing[4]],
    [820, (820 - theme.contentWidths.readable) / 2],
    [1032, (1032 - theme.contentWidths.readable) / 2],
  ])('%d pt: the readable list content side padding is %d', (width, pad) => {
    setWindow(width, 1200);
    render(shell(<ReadableList />));
    expect(listPad()).toBe(pad);
  });

  it('tablet: the content box is not narrowed, so the side margins scroll', () => {
    setWindow(1032, 1376);
    render(shell(<ReadableList />));
    const box = StyleSheet.flatten(screen.getByTestId('app-shell-content').props.style);
    expect(box.paddingHorizontal ?? 0).toBe(0);
    expect(box.maxWidth).toBeUndefined();
    expect(box.flex).toBe(1);
  });
});
