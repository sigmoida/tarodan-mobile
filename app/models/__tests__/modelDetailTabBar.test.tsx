/**
 * Model detail keeps the floating bottom tab bar (`withStackTabBar`): the bar renders in the content,
 * loading, not-found and error states; the page scrolls in a ScrollView bound to the bar's handler and
 * leaves room for the bar at the bottom.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders as render } from '@/test-utils';
import { dismissToMock, resetRouterMocks } from '@/test-utils/router-mock';
import { TAB_PILL_HEIGHT, tabPillBottomOffset } from '@/components/shell/tabBarLayout';
import { theme } from '@/ui';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
const mockDetail = jest.fn();
jest.mock('../[slug]/_hooks/useModelDetail', () => ({ useModelDetail: () => mockDetail() }));

import ModelDetailScreen from '../[slug]/index';

const brand = { id: 'b1', name: 'Ferrari', slug: 'ferrari', country: 'IT' };
const detail = (over: Record<string, unknown> = {}) => ({
  modelQuery: { isLoading: false, isError: false, refetch: jest.fn() },
  productsQuery: { isLoading: false },
  model: { id: 'm1', name: 'F40', slug: 'f40', brand, yearStart: 1987, description: 'Efsane' },
  products: [{ id: 'p1', title: 'F40 1:18', price: 250, images: [] }],
  notFound: false,
  modelLoadFailed: false,
  refreshing: false,
  onRefresh: jest.fn(),
  ...over,
});
const barInset = TAB_PILL_HEIGHT + tabPillBottomOffset(0) + theme.spacing[4];

describe('model detail - bottom tab bar', () => {
  beforeEach(() => {
    mockDetail.mockReset();
    resetRouterMocks();
  });

  it('renders the bar with the model content, no tab highlighted', () => {
    mockDetail.mockReturnValue(detail());
    render(<ModelDetailScreen />);
    expect(screen.getByText('F40 1:18')).toBeOnTheScreen();
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
  });

  it('the page scroll view pads its bottom by the bar inset and feeds the top bar edge', () => {
    mockDetail.mockReturnValue(detail());
    render(<ModelDetailScreen />);
    const scroll = screen.getByTestId('model-detail-scroll');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(barInset);
    expect(scroll.props.onScroll).toBeTruthy();
    expect(scroll.props.refreshControl).toBeTruthy();
  });

  it('keeps the bar while the model is loading', () => {
    mockDetail.mockReturnValue(detail({ model: null, modelQuery: { isLoading: true, isError: false } }));
    render(<ModelDetailScreen />);
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
  });

  it('keeps the bar in the not-found and error states', () => {
    mockDetail.mockReturnValue(detail({ model: null, notFound: true }));
    const view = render(<ModelDetailScreen />);
    expect(screen.getByText('Modellere Dön')).toBeOnTheScreen();
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
    view.unmount();

    mockDetail.mockReturnValue(detail({ model: null, modelLoadFailed: true, modelQuery: { isLoading: false, isError: true, refetch: jest.fn() } }));
    render(<ModelDetailScreen />);
    expect(screen.getByTestId('error-state')).toBeOnTheScreen();
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
  });

  it('a tab tap pops back to the tabs (dismissTo)', () => {
    mockDetail.mockReturnValue(detail());
    render(<ModelDetailScreen />);
    fireEvent.press(screen.getByTestId('tab-profile'));
    expect(dismissToMock).toHaveBeenCalledWith('/(tabs)/profile');
  });
});
