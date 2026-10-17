/**
 * J52 · Katalog/arama: sonuç listesi render, boş durum.
 * J53 · Arama input + fiyat/sıralama filtre UI wiring (mobil-UI dilimleri).
 * Backend arama/sıralama mantığı backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock, replaceMock } from '@/test-utils/router-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn(), recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  searchApi: { autocompleteRich: jest.fn() },
}));
import { productsApi } from '@/lib/api';

// Filtre seçenekleri ağ çağrısı yapmasın (mobil-UI testi backend-bağımsız).
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({ manufacturers: [], brands: [], categories: [] }),
}));

// Ağır filtre sheet'i render dışı bırak (kendi testi var).
jest.mock('@/components/ProductFilterSheet', () => () => null);

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
  data: {
    items,
    meta: { page: 1, totalPages: 1, total: items.length },
  },
});

describe('catalog-search · arama ekranı (J52/J53)', () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    resetRouterMocks();
  });

  it('soğuk açılış (deep link /search, geçmiş yok): geri oku ana sekmeye replace eder', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });

  it('J52 · arama kutusu render olur', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-input')).toBeOnTheScreen();
  });

  it('arama kutusu üst barda (titleSlot): solda geri oku, "Ara" başlığı yok, sağ slot yok', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);
    const header = screen.getByTestId('screen-header');
    expect(within(header).getByTestId('search-input')).toBeOnTheScreen();
    expect(within(header).getByTestId('screen-header-back')).toBeOnTheScreen();
    expect(within(header).queryByTestId('screen-header-right')).toBeNull();
    expect(within(header).queryByText('Ara')).toBeNull();
  });

  it('J52 · sonuçlar gelince ürün kartları ve sonuç sayısı görünür', async () => {
    mockGetAll.mockResolvedValue(
      mockListResponse([makeProduct('p1', 'Ferrari F40'), makeProduct('p2', 'Lamborghini')]),
    );
    renderWithProviders(<SearchScreen />);

    await waitFor(() =>
      expect(screen.getAllByTestId('search-result-card').length).toBe(2),
    );
    expect(screen.getByText('Ferrari F40')).toBeOnTheScreen();
    expect(screen.getByText('2 sonuç bulundu')).toBeOnTheScreen();
  });

  it('J52 · yinelenen id tek karta indirilir (keyExtractor yalnız id)', async () => {
    mockGetAll.mockResolvedValue(
      mockListResponse([makeProduct('p1', 'Ferrari F40'), makeProduct('p1', 'Ferrari F40')]),
    );
    renderWithProviders(<SearchScreen />);

    await waitFor(() => expect(screen.getAllByTestId('search-result-card').length).toBe(1));
  });

  it('liste FlashList: 2 sütun, id anahtarı, geri dönüşüm penceresi', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([makeProduct('p1', 'Ferrari F40')]));
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getByTestId('search-result-card')).toBeOnTheScreen());

    const props = screen.UNSAFE_getAllByProps({ testID: 'search-results-list' })[0]!.props;
    expect(props.numColumns).toBe(2);
    expect(props.drawDistance).toBeGreaterThan(0);
    expect(props.keyExtractor({ id: 'p1' }, 0)).toBe('p1');
    expect(props.keyExtractor({ id: 'p1' }, 7)).toBe('p1');
  });

  it('J52 · boş sonuç → tek boş durum metni "Henüz ilan yok" görünür', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);

    await waitFor(() =>
      expect(screen.getByText('Henüz ilan yok')).toBeOnTheScreen(),
    );
    expect(screen.getByText('0 sonuç bulundu')).toBeOnTheScreen();
  });

  it('sıralama (fiyat artan/azalan) seçilince ürün sayısı sabit kalır, yalnız sortBy değişir', async () => {
    const items = [makeProduct('p1', 'Ferrari F40'), makeProduct('p2', 'Lamborghini'), makeProduct('p3', 'Porsche')];
    mockGetAll.mockImplementation(async (params: any) => ({
      data: {
        // Sunucu taklidi: aynı küme, yalnız sıra değişir.
        items: params.sortBy === 'price_desc' ? [...items].reverse() : items,
        meta: { page: 1, totalPages: 1, total: items.length },
      },
    }));
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(screen.getAllByTestId('search-result-card').length).toBe(3));

    for (const sortBy of ['price_asc', 'price_desc']) {
      mockGetAll.mockClear();
      fireEvent.press(screen.getByTestId('sort-button'));
      fireEvent.press(await screen.findByTestId(`product-sort-sheet-option-${sortBy}`));
      await waitFor(() =>
        expect(mockGetAll).toHaveBeenCalledWith({ limit: 24, page: 1, sortBy }),
      );
      await waitFor(() => expect(screen.getAllByTestId('search-result-card').length).toBe(3));
      expect(screen.getByText('3 sonuç bulundu')).toBeOnTheScreen();
    }
  });

  it('J53 · arama kutusuna yazınca değer ekrana yansır', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);

    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'ferrari');
    expect(input.props.value).toBe('ferrari');
  });

  it('regresyon: aramadan dönüp yeniden açılan /search önceki sorguyu taşımaz', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    const first = renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'ferrari');
    first.unmount();

    // Ana sayfa sahte alanı `/search?focus=1` açar (q yok) → yeni örnek boş başlar.
    mockGetAll.mockClear();
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-input').props.value).toBe('');
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    const params = mockGetAll.mock.calls[0][0];
    expect(params.search).toBeUndefined();
    expect(params.scale).toBeUndefined();
  });

  it('J53 · ürün kartına basınca ürün detayına navigasyon yapılır', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([makeProduct('p1', 'Ferrari F40')]));
    renderWithProviders(<SearchScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('search-result-card')).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('search-result-card'));
    expect(pushMock).toHaveBeenCalledWith('/product/p1');
  });

  it('arama kutusu yerel state tutar: yazarken istek atılmaz, 400ms debounce sonrası aranır', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    jest.useFakeTimers();
    try {
      mockGetAll.mockClear();
      fireEvent.changeText(screen.getByTestId('search-input'), 'ferr');
      fireEvent.changeText(screen.getByTestId('search-input'), 'ferrari');
      act(() => {
        jest.advanceTimersByTime(399);
      });
      expect(mockGetAll).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(2);
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    expect(mockGetAll.mock.calls[0]![0].search).toBe('ferrari');
  });
});
