/**
 * Cart on large screens (`cartLayout`, layout only): phones and medium windows keep one column with
 * the floating checkout bar at the page gutter; expanded and wider windows put the summary and the
 * checkout action in a right-hand panel. Amounts and gates are untouched.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { screen, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAGE_GUTTER, theme } from '@/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  // The quote stays pending: the layout does not depend on it.
  ordersApi: { getQuote: jest.fn(() => new Promise<never>(() => undefined)) },
  cartApi: {
    get: jest.fn(() => Promise.resolve({ data: null })),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateItem: jest.fn(),
    clear: jest.fn(),
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (state: { isAuthenticated: boolean; user: null }) => unknown) => {
    const state = { isAuthenticated: false, user: null };
    return selector ? selector(state) : state;
  },
}));

import { useCartStore } from '@/stores/cartStore';
import CartScreen from '../index';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

const item = {
  id: 'cart-1',
  productId: 'p1',
  title: 'Hot Wheels Mustang',
  price: 100,
  quantity: 1,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
};

describe('cart layout by width (layout only)', () => {
  beforeEach(() => useCartStore.setState({ items: [item], lastUpdated: Date.now(), isLoading: false }));
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
    useCartStore.setState({ items: [] });
  });

  const sideOf = (testID: string) => {
    const flat = StyleSheet.flatten(screen.getByTestId(testID).props.contentContainerStyle);
    return flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
  };
  const checkoutButtonStyle = () => StyleSheet.flatten(screen.getByTestId('cart-checkout-button').props.style);

  it.each([
    [390, PAGE_GUTTER, false],
    [820, theme.spacing[6], true],
  ])('%d pt: one column, floating checkout bar at the page gutter', async (width, side, wide) => {
    setWindow(width, 1180);
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(screen.getByTestId('cart-scroll')).toBeTruthy());
    expect(screen.queryByTestId('cart-two-column')).toBeNull();
    expect(screen.queryByTestId('cart-summary-panel')).toBeNull();
    expect(sideOf('cart-scroll')).toBe(side);
    const bar = StyleSheet.flatten(screen.getByTestId('cart-checkout-bar').props.style);
    expect([bar.left, bar.right]).toEqual([side, side]);
    // Phones: the button fills the bar; medium: natural width at the right (no stretched button).
    expect(checkoutButtonStyle().flex).toBe(wide ? undefined : 1);
    // The summary card sits in the one scroll body.
    expect(within(screen.getByTestId('cart-scroll')).getByTestId('cart-summary')).toBeTruthy();
  });

  it.each([1032, 1180])('%d pt: items left, summary + checkout in the right panel, no floating bar', async (width) => {
    setWindow(width, 1000);
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(screen.getByTestId('cart-two-column')).toBeTruthy());
    expect(screen.queryByTestId('cart-checkout-bar')).toBeNull();
    const items = within(screen.getByTestId('cart-scroll'));
    const panel = within(screen.getByTestId('cart-summary-panel'));
    expect(items.getByText('Hot Wheels Mustang')).toBeTruthy();
    expect(items.queryByTestId('cart-summary')).toBeNull();
    expect(panel.getByTestId('cart-summary')).toBeTruthy();
    expect(panel.getByTestId('cart-checkout-button')).toBeTruthy();
    expect(panel.getByTestId('cart-checkout-total')).toBeTruthy();
    // One checkout action, with the same gate (the quote is pending: no total yet -> disabled).
    expect(screen.getAllByTestId('cart-checkout-button')).toHaveLength(1);
    expect(screen.getByTestId('cart-checkout-button')).toBeDisabled();
    // Items take ~62% of the row; both columns sit at the expanded gutter.
    const itemsFlex = StyleSheet.flatten(screen.getByTestId('cart-scroll').props.style).flex;
    const panelFlex = StyleSheet.flatten(screen.getByTestId('cart-summary-panel').props.style).flex;
    expect(itemsFlex / (itemsFlex + panelFlex)).toBeCloseTo(0.62);
    expect(sideOf('cart-scroll')).toBe(theme.spacing[8]);
    expect(sideOf('cart-summary-panel')).toBe(theme.spacing[8]);
  });
});
