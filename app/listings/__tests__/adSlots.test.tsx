/**
 * /listings: header + inline (8. karttan sonra, 24. karttan sonra) + footer
 * reklam yuvaları. Izgara 2 sütunlu satırlara bölünür; afiş tam genişlikte.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

const mockListings = jest.fn();
jest.mock('../_hooks/useListings', () => ({ useListings: () => mockListings() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useFocusEffect: jest.fn(),
}));
// Yüzen alt menü (withStackTabBar) sayaçları: sepet deposu (AsyncStorage) / sorgu bağlamı gerekmesin.
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
jest.mock('@/components/ProductFilterSheet', () => () => null);
jest.mock('../_components/ListingsHeader', () => {
  const { AdBanner } = require('@/components/ads/AdBanner');
  return { ListingsHeader: () => <AdBanner position="header" /> };
});
jest.mock('@/components/product/ProductCard', () => {
  const { Text } = require('react-native');
  return { ProductCard: ({ product }: { product: { id: string } }) => <Text testID={`card-${product.id}`}>{product.id}</Text> };
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
  filters: { sortBy: 'created_desc' },
  options: {},
  sortMenuVisible: false,
  setSortMenuVisible: jest.fn(),
  activeFilterCount: 0,
  filterModalVisible: false,
  setFilterModalVisible: jest.fn(),
  setFilters: jest.fn(),
  setSortBy: jest.fn(),
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
    // Yüzen alt menü bu yığın ekranında da görünür (withStackTabBar).
    expect(queryByTestId('app-tab-bar')).toBeTruthy();
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

  it('kart satırı yatay (flexDirection: row): ikinci kart ilkinin yanında, altında değil', () => {
    mockListings.mockReturnValue(controller(3));
    const { getByTestId } = render(<ListingsScreen />);
    // Kartın atası olan ilk flexDirection:row View'ı = satır (kart bir hücre View'ına sarılı).
    const rowOf = (id: string) => {
      let node = getByTestId(`card-${id}`).parent;
      while (node && StyleSheet.flatten(node.props.style)?.flexDirection !== 'row') node = node.parent;
      return node!;
    };
    const flat = (id: string) => StyleSheet.flatten(rowOf(id).props.style);
    expect(flat('p1').flexDirection).toBe('row');
    // p1 ve p2 aynı satırda; p3 ikinci satırda (tek kart, sola dayalı).
    expect(rowOf('p1')).toBe(rowOf('p2'));
    expect(rowOf('p3')).not.toBe(rowOf('p1'));
    expect(flat('p3').flexDirection).toBe('row');
    expect(flat('p3').justifyContent).toBe('space-between');
  });
});
