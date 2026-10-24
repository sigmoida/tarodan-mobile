/**
 * Cart on large screens: the body and the floating checkout bar share the page gutter
 * (src/ui/CLAUDE.md › Large screens); phones keep the 16 pt gutter.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
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

describe('cart width', () => {
  beforeEach(() => useCartStore.setState({ items: [item], lastUpdated: Date.now(), isLoading: false }));
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
    useCartStore.setState({ items: [] });
  });

  it.each([
    [390, PAGE_GUTTER],
    [820, theme.spacing[6]],
    [1032, theme.spacing[8]],
  ])('%d pt: body and checkout bar side %d', async (width, side) => {
    setWindow(width, 1200);
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(screen.getByTestId('cart-scroll')).toBeTruthy());
    const body = StyleSheet.flatten(screen.getByTestId('cart-scroll').props.contentContainerStyle);
    expect(body.paddingLeft ?? body.paddingHorizontal ?? body.padding).toBe(side);
    const bar = StyleSheet.flatten(screen.getByTestId('cart-checkout-bar').props.style);
    expect([bar.left, bar.right]).toEqual([side, side]);
  });
});
