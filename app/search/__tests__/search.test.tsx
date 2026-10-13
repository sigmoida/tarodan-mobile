/**
 * J52 · Katalog/arama: sonuç listesi render, boş durum.
 * J53 · Arama input + fiyat/sıralama filtre UI wiring (mobil-UI dilimleri).
 * Backend arama/sıralama mantığı backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
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

  it('J52 · boş sonuç → tek boş durum metni "Henüz ilan yok" görünür', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);

    await waitFor(() =>
      expect(screen.getByText('Henüz ilan yok')).toBeOnTheScreen(),
    );
    expect(screen.getByText('0 sonuç bulundu')).toBeOnTheScreen();
  });

  it('J53 · arama kutusuna yazınca değer ekrana yansır', async () => {
    mockGetAll.mockResolvedValue(mockListResponse([]));
    renderWithProviders(<SearchScreen />);

    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'ferrari');
    expect(input.props.value).toBe('ferrari');
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
