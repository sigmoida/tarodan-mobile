/**
 * B6 · Arama üst çubukları: ölçüm/collapse sözleşmesi.
 *
 * Liste üst boşluğu artık tahminden değil, gerçek `onLayout` ölçümünden geliyor.
 * Bu testler hem "ölçülmeden liste gizli" davranışını hem de kaydırmaya bağlı
 * collapse mantığının (aşağı → gizle, yukarı → geri getir, eşik altında dokunma)
 * korunduğunu kilitler.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { renderHook, act, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders, makeTestQueryClient } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn() },
  searchApi: { autocompleteRich: jest.fn(), users: jest.fn() },
}));
import { productsApi } from '@/lib/api';

jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({ manufacturers: [], brands: [], categories: [] }),
}));

jest.mock('@/components/ProductFilterSheet', () => () => null);

import { useSearch } from '../_hooks/useSearch';
import SearchScreen from '../search';

const mockGetAll = productsApi.getAll as jest.Mock;

const makeProduct = (id: string, title: string) => ({
  id,
  title,
  brand: 'Hot Wheels',
  scale: '1:64',
  price: 199,
  images: [],
});

const mockListResponse = (items: any[]) => ({
  data: { items, meta: { page: 1, totalPages: 1, total: items.length } },
});

const layoutEvent = (height: number) =>
  ({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height } } }) as any;

const scrollEvent = (y: number) =>
  ({ nativeEvent: { contentOffset: { y }, contentSize: { height: 4000, width: 320 }, layoutMeasurement: { height: 800, width: 320 } } }) as any;

function hookWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('B6 · arama üst çubukları — ölçüm ve collapse', () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockGetAll.mockResolvedValue(mockListResponse([]));
    resetRouterMocks();
  });

  it('headerHeight tahminle değil sıfırdan başlar; ölçülene kadar liste konumlanmamış sayılır', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });

    expect(result.current.headerHeight).toBe(0);
    expect(result.current.barsMeasured).toBe(false);
  });

  it('onBarsLayout gerçek yüksekliği yazar ve listeyi konumlanmış işaretler', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });

    act(() => result.current.onBarsLayout(layoutEvent(212)));

    expect(result.current.headerHeight).toBe(212);
    expect(result.current.barsMeasured).toBe(true);
  });

  it('aşağı kaydırınca çubuklar gizlenir, yukarı kaydırınca geri gelir', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });

    act(() => result.current.onBarsLayout(layoutEvent(200)));
    expect(result.current.topBarsHidden).toBe(false);

    // Eşiğin (headerHeight) altındaki aşağı kaydırma çubuklara dokunmaz.
    act(() => result.current.handleResultsScroll(scrollEvent(120)));
    expect(result.current.topBarsHidden).toBe(false);

    // Eşiği geçen aşağı kaydırma → gizle.
    act(() => result.current.handleResultsScroll(scrollEvent(320)));
    expect(result.current.topBarsHidden).toBe(true);

    // Yukarı kaydırma → geri getir.
    act(() => result.current.handleResultsScroll(scrollEvent(240)));
    expect(result.current.topBarsHidden).toBe(false);
  });

  it('en üste dönünce çubuklar her koşulda geri gelir', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });

    act(() => result.current.onBarsLayout(layoutEvent(200)));
    act(() => result.current.handleResultsScroll(scrollEvent(400)));
    expect(result.current.topBarsHidden).toBe(true);

    act(() => result.current.handleResultsScroll(scrollEvent(0)));
    expect(result.current.topBarsHidden).toBe(false);
  });

  it('liste yükleme sırasında sökülmez; spinner boş-durum yuvasında gösterilir', async () => {
    let resolve!: (v: any) => void;
    mockGetAll.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderWithProviders(<SearchScreen />);

    // Yükleme sırasında bile FlatList monte.
    expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
    expect(screen.getByText('Sonuçlar yükleniyor...')).toBeOnTheScreen();

    await act(async () => {
      resolve(mockListResponse([makeProduct('p1', 'Ferrari F40')]));
    });

    await waitFor(() => expect(screen.getByText('Ferrari F40')).toBeOnTheScreen());
    // Aynı liste hâlâ ayakta — yükleme dönüşünde sıfırdan yerleşmedi.
    expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
  });

  it('liste üst boşluğu ölçülen yükseklikten gelir ve ölçülene kadar liste gizli', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([makeProduct('p1', 'Ferrari F40')]));
    renderWithProviders(<SearchScreen />);

    const list = screen.getByTestId('search-results-list');
    const flatten = (s: any): any => (StyleSheet.flatten(s) ?? {}) as any;

    // Ölçüm gelmeden liste görünmez (opacity 0) ve üst boşluk 0.
    expect(flatten(list.props.style).opacity).toBe(0);
    expect(flatten(list.props.contentContainerStyle).paddingTop).toBe(0);

    const bars = screen.getByTestId('search-collapsible-bars');
    await act(async () => {
      bars.props.onLayout(layoutEvent(212));
    });

    const measured = screen.getByTestId('search-results-list');
    expect(flatten(measured.props.style).opacity).toBeUndefined();
    expect(flatten(measured.props.contentContainerStyle).paddingTop).toBe(212);
  });
});
