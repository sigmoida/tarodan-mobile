/**
 * Manufacturer and brand product screens (`EntityProductsScreen`) keep the floating bottom tab bar:
 * the bar renders in every state, the grid leaves room for it (also for the list-placed empty / error
 * states) and a tab tap pops back to the tabs.
 */
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { dismissToMock, resetRouterMocks } from '@/test-utils/router-mock';
import { TAB_PILL_HEIGHT, tabPillBottomOffset } from '@/components/shell/tabBarLayout';
import { theme } from '@/ui';

jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ slug: 'hot-wheels' }),
}));
jest.mock('@/lib/api', () => ({
  brandsApi: { findBySlug: jest.fn() },
  manufacturersApi: { findBySlug: jest.fn() },
  productsApi: { getAll: jest.fn(), recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));

import { brandsApi, manufacturersApi, productsApi } from '@/lib/api';
import { EntityProductsScreen } from '../EntityProductsScreen';

const findBrand = brandsApi.findBySlug as jest.Mock;
const findManufacturer = manufacturersApi.findBySlug as jest.Mock;
const getAll = productsApi.getAll as jest.Mock;

const entity = { id: 'e1', name: 'Hot Wheels', slug: 'hot-wheels', productCount: 1 };
const barInset = TAB_PILL_HEIGHT + tabPillBottomOffset(0) + theme.spacing[4];
const grid = () => screen.UNSAFE_getAllByType(FlatList)[0]!;

describe.each([
  ['brand', findBrand, 'Bu markaya ait ürün yok'],
  ['manufacturer', findManufacturer, 'Bu üreticiye ait ürün yok'],
] as const)('EntityProductsScreen (%s) - bottom tab bar', (kind, find, emptyTitle) => {
  beforeEach(() => {
    findBrand.mockReset();
    findManufacturer.mockReset();
    getAll.mockReset();
    resetRouterMocks();
    find.mockResolvedValue({ data: { data: entity } });
  });

  it('renders the bar with products, no tab highlighted, and pads the grid by the bar inset', async () => {
    getAll.mockResolvedValue({ data: { data: [{ id: 'p1', title: 'Mustang GT', price: 950, images: [], status: 'active' }] } });
    renderWithProviders(<EntityProductsScreen kind={kind} />);
    expect(await screen.findByText('Mustang GT')).toBeOnTheScreen();
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
    expect(StyleSheet.flatten(grid().props.contentContainerStyle).paddingBottom).toBe(barInset);
  });

  it('keeps the bar and the bottom padding in the list-placed empty state', async () => {
    getAll.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<EntityProductsScreen kind={kind} />);
    await waitFor(() => expect(screen.getByText(emptyTitle)).toBeOnTheScreen());
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    expect(StyleSheet.flatten(grid().props.contentContainerStyle).paddingBottom).toBe(barInset);
  });

  it('keeps the bar and the bottom padding in the list-placed error state', async () => {
    getAll.mockRejectedValue(new Error('boom'));
    renderWithProviders(<EntityProductsScreen kind={kind} />);
    await waitFor(() => expect(screen.getByText('Ürünler yüklenemedi')).toBeOnTheScreen());
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    expect(StyleSheet.flatten(grid().props.contentContainerStyle).paddingBottom).toBe(barInset);
  });

  it('wires the page scroll handler (top bar edge) into the grid; the fixed bar needs no measurements', async () => {
    getAll.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<EntityProductsScreen kind={kind} />);
    await waitFor(() => expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen());
    expect(grid().props.onScroll).toBeTruthy();
  });

  it('a tab tap pops back to the tabs (dismissTo)', async () => {
    getAll.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<EntityProductsScreen kind={kind} />);
    await waitFor(() => expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('tab-favorites'));
    expect(dismissToMock).toHaveBeenCalledWith('/(tabs)/favorites');
  });
});
