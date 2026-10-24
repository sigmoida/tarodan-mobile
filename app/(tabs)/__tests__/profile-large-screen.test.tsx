/**
 * Profile tab root on large screens: the menu goes edge to edge with the tablet gutter
 * (src/ui/CLAUDE.md › Large screens); phones keep the page gutter.
 */
import React from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAGE_GUTTER, theme } from '@/ui';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0 }),
}));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));

let mockF: Record<string, unknown>;
jest.mock('../_hooks/useProfile', () => ({ useProfile: () => mockF }));

import ProfileScreen from '../profile';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const member = {
  isAuthenticated: true,
  user: { id: 'u1', displayName: 'Ayşe Yılmaz', email: 'ayse@example.com' },
  isPaidTier: false,
  effectiveTier: 'free',
  refreshing: false,
  onRefresh: jest.fn(),
  handleLogout: jest.fn(),
};
const guest = { isAuthenticated: false, showPrompt: false, setShowPrompt: jest.fn(), promptType: 'favorites' };

/** The tab root's own (outermost) scroll view. */
const rootScroll = () => screen.UNSAFE_getAllByType(ScrollView)[0]!;
const sidePad = () => {
  const flat = StyleSheet.flatten(rootScroll().props.contentContainerStyle);
  return flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
};

describe('profile width', () => {
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });

  it.each([
    [390, PAGE_GUTTER],
    [820, theme.spacing[6]],
    [1032, theme.spacing[8]],
  ])('%d pt: member and guest menus have side padding %d', (width, side) => {
    setWindow(width, 1200);
    mockF = member;
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-header')).toBeTruthy();
    expect(sidePad()).toBe(side);
    screen.unmount();

    mockF = guest;
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-go-login-button')).toBeTruthy();
    expect(sidePad()).toBe(side);
  });

  it.each([
    [390, false],
    [820, false],
    [1032, true],
  ])('%d pt: member menu groups in two columns: %s', (width, twoColumns) => {
    setWindow(width, 1200);
    mockF = member;
    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByTestId('menu-group-columns') != null).toBe(twoColumns);
  });
});
