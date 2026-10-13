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
  productsApi: { getAll: jest.fn(), recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  searchApi: { autocompleteRich: jest.fn(), users: jest.fn() },
}));
import { productsApi, searchApi } from '@/lib/api';
import { useRecentSearchesStore } from '@/stores/recentSearchesStore';

jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({ manufacturers: [], brands: [], categories: [] }),
}));

jest.mock('@/components/ProductFilterSheet', () => () => null);

import { useSearch } from '../_hooks/useSearch';
import { nextBarsHidden, shouldShowScrollTop } from '../_lib/barsCollapse';
import SearchScreen from '..';

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

// Reanimated scroll handler jest'te `{ workletEventHandler }` döner; worklet'i doğrudan çağırıyoruz
// (UI thread'i yok → shared value'lar ve `scheduleOnRN` aynı thread'de eşzamanlı çalışır).
const fireScroll = (controller: ReturnType<typeof useSearch>, y: number) =>
  (controller.handleResultsScroll as any).workletEventHandler.worklet({
    eventName: 'onScroll',
    contentOffset: { x: 0, y },
    contentSize: { height: 4000, width: 320 },
    layoutMeasurement: { height: 800, width: 320 },
  });

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

  // Kaydırma kararı artık UI thread'inde (Reanimated scroll handler). Kural saf bir worklet'te
  // (`nextBarsHidden`) → burada doğrudan, ardından gerçek handler üzerinden uçtan uca test edilir.
  describe('nextBarsHidden (saf kural)', () => {
    it('aşağı kaydırınca çubuklar gizlenir, yukarı kaydırınca geri gelir', () => {
      // Eşiğin (headerHeight) altındaki aşağı kaydırma çubuklara dokunmaz.
      expect(nextBarsHidden(120, 0, false, true, 200)).toBe(false);
      // Eşiği geçen aşağı kaydırma → gizle.
      expect(nextBarsHidden(320, 120, false, true, 200)).toBe(true);
      // Gizliyken aşağı devam → gizli kalır.
      expect(nextBarsHidden(400, 320, true, true, 200)).toBe(true);
      // Yukarı kaydırma → geri getir.
      expect(nextBarsHidden(240, 320, true, true, 200)).toBe(false);
    });

    it('küçük hareket (<=6pt) ve ölçülmemiş çubuk durumu değiştirmez', () => {
      expect(nextBarsHidden(325, 320, false, true, 200)).toBe(false);
      expect(nextBarsHidden(318, 320, true, true, 200)).toBe(true);
      expect(nextBarsHidden(900, 0, false, false, 0)).toBe(false);
    });

    it('en üste dönünce çubuklar her koşulda geri gelir', () => {
      expect(nextBarsHidden(0, 400, true, true, 200)).toBe(false);
      expect(nextBarsHidden(4, 400, true, true, 200)).toBe(false);
    });

    it('"en üste dön" eşiği 600pt', () => {
      expect(shouldShowScrollTop(600)).toBe(false);
      expect(shouldShowScrollTop(601)).toBe(true);
    });
  });

  it('gerçek scroll handler: aşağı kaydırınca çubuklar gizlenir, yukarı kaydırınca geri gelir', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });

    act(() => result.current.onBarsLayout(layoutEvent(200)));
    expect(result.current.barsHidden.value).toBe(false);

    act(() => fireScroll(result.current, 120));
    expect(result.current.barsHidden.value).toBe(false);

    act(() => fireScroll(result.current, 320));
    expect(result.current.barsHidden.value).toBe(true);

    act(() => fireScroll(result.current, 240));
    expect(result.current.barsHidden.value).toBe(false);

    // En üste dönünce her koşulda geri gelir.
    act(() => fireScroll(result.current, 500));
    expect(result.current.barsHidden.value).toBe(true);
    act(() => fireScroll(result.current, 0));
    expect(result.current.barsHidden.value).toBe(false);
  });

  it('gerçek scroll handler: açık öneri/geçmiş paneli kaydırınca kapanır', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });
    act(() => result.current.onInputFocus());
    expect(result.current.showRecentSearches).toBe(true);

    await act(async () => fireScroll(result.current, 30));
    await waitFor(() => expect(result.current.showRecentSearches).toBe(false));
    expect(result.current.autocompleteOpen).toBe(false);
  });

  it('gerçek scroll handler: 600pt eşiğinde "en üste dön" JS state\'ine yansır', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });
    expect(result.current.showScrollTop).toBe(false);

    // scheduleOnRN JS thread'ine asenkron döner → bekle.
    await act(async () => fireScroll(result.current, 700));
    await waitFor(() => expect(result.current.showScrollTop).toBe(true));

    await act(async () => fireScroll(result.current, 10));
    await waitFor(() => expect(result.current.showScrollTop).toBe(false));
  });

  it('liste yükleme sırasında sökülmez; iskelet boş-durum yuvasında gösterilir', async () => {
    let resolve!: (v: any) => void;
    mockGetAll.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderWithProviders(<SearchScreen />);

    // Yükleme sırasında bile FlatList monte.
    expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
    expect(screen.getByTestId('product-grid-skeleton')).toBeOnTheScreen();

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

    // FlashList v2: `style` kapsayıcı View'a, `contentContainerStyle` kaydırma bileşenine gider; ikisini de
    // ana bileşenin prop'larından okuruz (en dıştaki testID eşleşmesi = AnimatedFlashList elemanı).
    const listProps = () => screen.UNSAFE_getAllByProps({ testID: 'search-results-list' })[0]!.props;
    const flatten = (s: any): any => (StyleSheet.flatten(s) ?? {}) as any;

    // Ölçüm gelmeden liste görünmez (opacity 0) ve üst boşluk 0.
    expect(flatten(listProps().style).opacity).toBe(0);
    expect(flatten(listProps().contentContainerStyle).paddingTop).toBe(0);

    const bars = screen.getByTestId('search-collapsible-bars');
    await act(async () => {
      bars.props.onLayout(layoutEvent(212));
    });

    expect(flatten(listProps().style).opacity).toBeUndefined();
    expect(flatten(listProps().contentContainerStyle).paddingTop).toBe(212);
  });

  it('pull-to-refresh yalnız ilk sayfayı yeniler; sonraki sayfa yüklemesi refreshing yapmaz', async () => {
    mockGetAll.mockImplementation(async (p: any) => ({
      data: {
        items: [makeProduct(`p${p.page}`, `Ürün ${p.page}`)],
        meta: { page: p.page, totalPages: 3, total: 3 },
      },
    }));
    const { result } = renderHook(() => useSearch(), {
      wrapper: hookWrapper(makeTestQueryClient()),
    });
    await waitFor(() => expect(result.current.products.length).toBe(1));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.products.length).toBe(2));
    expect(result.current.refreshing).toBe(false);

    mockGetAll.mockClear();
    await act(async () => {
      await result.current.refreshFirstPage();
    });

    // Yalnız sayfa 1 yeniden istendi (2. sayfa tekrar çekilmedi).
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetAll.mock.calls[0]![0].page).toBe(1);
    expect(result.current.refreshing).toBe(false);
  });

  describe('öneri sorguları ve son aramalar', () => {
    beforeEach(() => {
      (searchApi.autocompleteRich as jest.Mock).mockReset().mockResolvedValue({ data: { suggestions: [] } });
      (searchApi.users as jest.Mock).mockReset().mockResolvedValue({ data: [] });
      useRecentSearchesStore.setState({ searches: [] });
    });

    it('öneri sorguları yalnız panel açıkken (kutu odakta) atılır', async () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: hookWrapper(makeTestQueryClient()),
      });

      act(() => result.current.commitQuery('ferrari'));
      await waitFor(() => expect(result.current.autocompleteQuery).toBe('ferrari'));
      expect(searchApi.autocompleteRich).not.toHaveBeenCalled();
      expect(searchApi.users).not.toHaveBeenCalled();

      act(() => result.current.onInputFocus());
      await waitFor(() => expect(searchApi.autocompleteRich).toHaveBeenCalledWith('ferrari'));
      expect(searchApi.users).toHaveBeenCalledWith('ferrari', 6);
    });

    it('debounce ile her ara değer son aramaya yazılmaz; yalnız onaylanınca yazılır', async () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: hookWrapper(makeTestQueryClient()),
      });

      act(() => result.current.commitQuery('fer'));
      act(() => result.current.commitQuery('ferra'));
      expect(useRecentSearchesStore.getState().searches).toHaveLength(0);

      // Enter
      act(() => result.current.saveRecentSearch('ferrari'));
      expect(useRecentSearchesStore.getState().searches.map((s) => s.query)).toEqual(['ferrari']);

      // Öneriden seçim
      act(() => result.current.pickSuggestion('porsche 911'));
      expect(useRecentSearchesStore.getState().searches.map((s) => s.query)).toEqual([
        'porsche 911',
        'ferrari',
      ]);
    });

    it('öneriden ürün/satıcıya gidilince yazılan sorgu kaydedilir', async () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: hookWrapper(makeTestQueryClient()),
      });
      act(() => result.current.commitQuery('lamborghini'));
      await waitFor(() => expect(result.current.autocompleteQuery).toBe('lamborghini'));

      act(() => result.current.confirmQuery());
      expect(useRecentSearchesStore.getState().searches.map((s) => s.query)).toEqual(['lamborghini']);
    });
  });
});
