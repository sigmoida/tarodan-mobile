/**
 * /listings: header + inline (8. karttan sonra, 24. karttan sonra) + footer
 * reklam yuvaları. Izgara 2 sütunlu satırlara bölünür; afiş tam genişlikte.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockListings = jest.fn();
jest.mock('../_hooks/useListings', () => ({ useListings: () => mockListings() }));

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));
jest.mock('@/components/ProductFilterSheet', () => () => null);
jest.mock('../_components/ListingsSearchBar', () => ({ ListingsSearchBar: () => null }));
jest.mock('../_components/ListingsSortModal', () => ({ ListingsSortModal: () => null }));
jest.mock('../_components/ListingCard', () => {
  const { Text } = require('react-native');
  return { ListingCard: ({ item }: { item: { id: string } }) => <Text testID={`card-${item.id}`}>{item.id}</Text> };
});
jest.mock('@/components/ads/AdBanner', () => {
  const { Text } = require('react-native');
  return {
    AdBanner: ({ position, slotKey }: { position: string; slotKey?: string }) => (
      <Text testID={`slot-${slotKey ?? position}`}>{position}</Text>
    ),
  };
});

import ListingsScreen from '../index';

const controller = (n: number) => ({
  isLoading: false,
  listings: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` })),
  total: n,
  filters: {},
  options: {},
  filterModalVisible: false,
  setFilterModalVisible: jest.fn(),
  setFilters: jest.fn(),
  clearFilters: jest.fn(),
  isFetching: false,
  isFetchingNextPage: false,
  isRefetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

describe('/listings reklam yuvaları', () => {
  it('header ve footer yuvası her zaman; 8 karttan azında inline yok', () => {
    mockListings.mockReturnValue(controller(5));
    const { queryByTestId } = render(<ListingsScreen />);
    expect(queryByTestId('slot-header')).toBeTruthy();
    expect(queryByTestId('slot-footer')).toBeTruthy();
    expect(queryByTestId('slot-inline-0')).toBeNull();
  });

  it('inline yuva 8. karttan sonra gelir (yuva 0), kartlar eksiksiz çizilir', () => {
    mockListings.mockReturnValue(controller(12));
    const { queryByTestId } = render(<ListingsScreen />);
    expect(queryByTestId('slot-inline-0')).toBeTruthy();
    expect(queryByTestId('slot-inline-1')).toBeNull();
    for (let i = 1; i <= 12; i += 1) expect(queryByTestId(`card-p${i}`)).toBeTruthy();
  });

  it('boş sonuçta da header/footer yuvası çizilir, inline yok', () => {
    mockListings.mockReturnValue(controller(0));
    const { queryByTestId } = render(<ListingsScreen />);
    expect(queryByTestId('slot-header')).toBeTruthy();
    expect(queryByTestId('slot-footer')).toBeTruthy();
    expect(queryByTestId('slot-inline-0')).toBeNull();
  });
});
