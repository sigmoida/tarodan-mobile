/**
 * Search results keep the floating bottom tab bar (`withStackTabBar`): the bar renders, the results list
 * leaves room for it, the scroll-to-top FAB floats above it, and one composed scroll handler drives both
 * the search bars collapse and the bar collapse.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { captureHardwareBack } from '@/test-utils/hardware-back';
import { dismissToMock, resetRouterMocks } from '@/test-utils/router-mock';
import { FAB_SIZE_SM, theme } from '@/ui';
import { TAB_PILL_HEIGHT, tabPillBottomOffset } from '@/components/shell/tabBarLayout';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn(), recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  searchApi: { autocompleteRich: jest.fn(), users: jest.fn() },
}));
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({ manufacturers: [], brands: [], categories: [] }),
}));
jest.mock('@/components/ProductFilterSheet', () => () => null);
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
let mockKeyboardHeight = 0;
jest.mock('@/hooks/useKeyboardHeight', () => ({
  ...jest.requireActual('@/hooks/useKeyboardHeight'),
  useKeyboardHeight: () => mockKeyboardHeight,
}));

import { productsApi } from '@/lib/api';
import SearchScreen from '..';
import { SearchSuggestions } from '../_components/SearchSuggestions';

const { spacing } = theme;
const mockGetAll = productsApi.getAll as jest.Mock;

const product = (id: string) => ({ id, title: `Car ${id}`, brand: 'Hot Wheels', scale: '1:64', price: 199, images: [] });
const listResponse = (items: unknown[]) => ({
  data: { items, meta: { page: 1, totalPages: 1, total: items.length } },
});

const barTop = TAB_PILL_HEIGHT + tabPillBottomOffset(0);
const list = () => screen.UNSAFE_getAllByProps({ testID: 'search-results-list' })[0]!;

type ComposedScrollHandler = { workletEventHandler: { worklet: (event: unknown) => void } };
const scrollEvent = (y: number) => ({
  eventName: 'onScroll',
  contentOffset: { x: 0, y },
  contentSize: { height: 6000, width: 320 },
  layoutMeasurement: { height: 800, width: 320 },
});
// The composed Reanimated handler runs on the UI thread in the app; in jest we call its worklet directly.
const scrollTo = (y: number) =>
  act(() => {
    (list().props.onScroll as ComposedScrollHandler).workletEventHandler.worklet(scrollEvent(y));
  });

describe('search - bottom tab bar', () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockGetAll.mockResolvedValue(listResponse([product('1'), product('2')]));
    mockKeyboardHeight = 0;
    resetRouterMocks();
  });

  it('renders the bar with no highlighted tab, with results', async () => {
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    ['tab-home', 'tab-favorites', 'tab-cart', 'tab-profile'].forEach((id) =>
      expect(screen.getByTestId(id).props.accessibilityState).toEqual({ selected: false }),
    );
  });

  it('keeps the bar when there are no results', async () => {
    mockGetAll.mockResolvedValue(listResponse([]));
    renderWithProviders(<SearchScreen />);
    expect(await screen.findByText('Henüz ilan yok')).toBeOnTheScreen();
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
  });

  it('keeps the bar when the search fails', async () => {
    mockGetAll.mockRejectedValue(new Error('boom'));
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeOnTheScreen());
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
  });

  it('the results list bottom padding clears the bar and the scroll-to-top FAB above it', async () => {
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    const padding = StyleSheet.flatten(list().props.contentContainerStyle).paddingBottom as number;
    expect(padding).toBe(barTop + spacing[2] + FAB_SIZE_SM + spacing[2]);
    expect(padding).toBeGreaterThan(barTop);
  });

  it('the scroll-to-top FAB floats above the bar, never over the "+" button', async () => {
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    expect(screen.queryByLabelText('En üste dön')).toBeNull();
    scrollTo(1200);
    const fab = await screen.findByLabelText('En üste dön');
    expect(StyleSheet.flatten(fab.props.style).bottom).toBe(barTop + spacing[2]);
    expect(screen.getByTestId('tab-sell')).toBeOnTheScreen();
  });

  it('scrolling the results never changes the bar (no collapse)', async () => {
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    const pillStyle = () => StyleSheet.flatten(screen.getByTestId('app-tab-pill').props.style);
    const before = pillStyle();
    for (let y = 0; y <= 1200; y += 100) scrollTo(y);
    for (let y = 1200; y >= 900; y -= 50) scrollTo(y);
    expect(pillStyle()).toEqual(before);
    expect(screen.getByTestId('app-tab-pill').props.pointerEvents).toBeUndefined();
    expect(screen.getByTestId('tab-sell')).toBeOnTheScreen();
    expect(list().props.onScroll).toBeTruthy();
  });

  it('hides the bar while the keyboard is open', async () => {
    mockKeyboardHeight = 300;
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    expect(screen.queryByTestId('app-tab-bar')).toBeNull();
  });

  it('a tab tap pops back to the tabs (dismissTo), not a push', async () => {
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    fireEvent.press(screen.getByTestId('tab-cart'));
    expect(dismissToMock).toHaveBeenCalledWith('/(tabs)/cart');
  });

  it('Android hardware back is not intercepted by the screen or the bar (the stack pops as before)', async () => {
    const back = captureHardwareBack();
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card')).toHaveLength(2));
    expect(back.press()).toBe(false);
    back.restore();
  });

  describe('suggestions page bottom padding', () => {
    const noop = () => undefined;
    const renderSuggestions = () =>
      renderWithProviders(
        <SearchSuggestions
          showRecentSearches
          recentSearchQueries={['f40']}
          inputEmpty
          onClearRecent={noop}
          onSelectRecent={noop}
          onRemoveRecent={noop}
          autocompleteOpen={false}
          autocompleteQuery=""
          autocomplete={undefined}
          sellerResults={[]}
          onPickSuggestion={noop}
          onCloseAutocomplete={noop}
          onNavigateSuggestion={noop}
          onApplyFacet={noop}
        />,
      );
    const padding = () =>
      StyleSheet.flatten(screen.getByTestId('search-suggestions-page').props.contentContainerStyle).paddingBottom;

    it('clears the keyboard while it is open (the bar is hidden then)', () => {
      mockKeyboardHeight = 300;
      renderSuggestions();
      expect(padding()).toBe(300 + spacing[4]);
    });

    it('clears the tab bar when the keyboard closes but the page stays open (focused input)', () => {
      mockKeyboardHeight = 0;
      renderSuggestions();
      expect(screen.getByText('f40')).toBeOnTheScreen();
      expect(padding()).toBe(barTop + spacing[4]);
    });
  });
});
