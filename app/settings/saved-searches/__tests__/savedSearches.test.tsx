/**
 * Saved-searches screen on the API (contract delta 2026-10-21-saved-searches): the server list with
 * every page, the server limit (0 is valid, never `|| 5`, no "unlimited"), delete with a confirm,
 * Run through the vendored `savedSearchToRouteParams`, and no upgrade button and no notification
 * toggle (tarodan-ops ADR 0003; no notifications in v1).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock } from '@/test-utils/router-mock';
import { appAlert, toast } from '@/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/ui', () => {
  const { confirmWith } = jest.requireActual('@/ui/components/AlertDialog');
  const appAlertMock = jest.fn();
  return {
    ...jest.requireActual('@/ui'),
    appAlert: appAlertMock,
    // `confirm` resolves through the mocked alert, as in jest.setup.ts.
    confirm: (options: unknown) => confirmWith(appAlertMock, options),
    toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
  };
});
jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  savedSearchesApi: { list: jest.fn(), remove: jest.fn() },
}));

import { savedSearchesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { savedSearchToRouteParams, type SavedSearch } from '@/types';
import { filtersFromSearchParams } from '@/utils/productFilters';
import SavedSearchesScreen from '../index';
import { fetchAllSavedSearches } from '../_hooks/useSavedSearches';

const list = savedSearchesApi.list as jest.Mock;
const remove = savedSearchesApi.remove as jest.Mock;
const alertMock = appAlert as jest.Mock;
const toastMock = toast as unknown as { success: jest.Mock; error: jest.Mock };

const search = (over: Partial<SavedSearch> = {}): SavedSearch => ({
  id: 's1',
  name: 'BMW 1/18',
  query: { search: 'bmw', tradeOnly: true, minPrice: 100, maxPrice: 500, condition: 'new' },
  labels: {},
  createdAt: '2026-10-21T10:00:00.000Z',
  ...over,
});

const page = (data: SavedSearch[], total = data.length, pageNo = 1, totalPages = 1) => ({
  data: { data, meta: { total, page: pageNo, limit: 100, totalPages } },
});

const setSession = (limit: number | undefined, isAuthenticated = true) =>
  useAuthStore.setState({
    isAuthenticated,
    limits: limit === undefined ? null : ({ maxSavedSearches: limit } as any),
  });

describe('saved searches · screen', () => {
  beforeEach(() => {
    resetRouterMocks();
    list.mockReset();
    remove.mockReset();
    alertMock.mockClear();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    setSession(5);
  });

  // Let the last query / mutation of a test settle inside act before the next one starts.
  afterEach(async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('lists the server rows with name, chips and saved date, and shows count / server limit', async () => {
    list.mockResolvedValue(
      page([search(), search({ id: 's2', name: null, query: { discountOnly: true } })]),
    );
    renderWithProviders(<SavedSearchesScreen />);

    expect(await screen.findByText('BMW 1/18')).toBeOnTheScreen();
    expect(list).toHaveBeenCalledWith(1);
    // Chips are the search screen's chips for the same filters; the free text goes first.
    expect(screen.getByText('Ara: "bmw"')).toBeOnTheScreen();
    expect(screen.getByText('Takas Yapılabilir')).toBeOnTheScreen();
    expect(screen.getByText('İndirimdekiler')).toBeOnTheScreen();
    // A null name renders the untitled copy; the date is the long locale date.
    expect(screen.getByText('Kayıtlı arama')).toBeOnTheScreen();
    expect(screen.getAllByText(/Kaydedildi: 21 Ekim 2026/)).toHaveLength(2);
    expect(screen.getByText('2 / 5 arama')).toBeOnTheScreen();
    // No notification toggle (v1) and no limit alert below the limit.
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByTestId('saved-search-limit')).toBeNull();
  });

  it('at the limit: a neutral alert with the server limit, no upgrade button, no price', async () => {
    setSession(2);
    list.mockResolvedValue(page([search(), search({ id: 's2' })]));
    renderWithProviders(<SavedSearchesScreen />);

    const alert = await screen.findByTestId('saved-search-limit');
    expect(within(alert).getByText('Kayıtlı arama limiti')).toBeOnTheScreen();
    expect(within(alert).getByText('Kayıtlı arama limitinize ulaştınız (2 arama).')).toBeOnTheScreen();
    expect(screen.queryByText(/premium|₺|yükselt/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /premium|yükselt/i })).toBeNull();
  });

  it('limit 0 is a valid limit (read with ??, never || 5)', async () => {
    setSession(0);
    list.mockResolvedValue(page([]));
    renderWithProviders(<SavedSearchesScreen />);
    expect(await screen.findByText('0 / 0 arama')).toBeOnTheScreen();
    expect(await screen.findByText('Kayıtlı arama limitinize ulaştınız (0 arama).')).toBeOnTheScreen();
  });

  it('a limit the server has not told yet shows no count and no limit alert (no client fallback)', async () => {
    setSession(undefined);
    list.mockResolvedValue(page([search()]));
    renderWithProviders(<SavedSearchesScreen />);
    await screen.findByText('BMW 1/18');
    expect(screen.queryByText(/arama$/)).toBeNull();
    expect(screen.queryByTestId('saved-search-limit')).toBeNull();
  });

  it('empty list: the empty state with the search shortcut', async () => {
    list.mockResolvedValue(page([]));
    renderWithProviders(<SavedSearchesScreen />);
    expect(await screen.findByText('Kayıtlı Arama Yok')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('İlan Ara'));
    expect(pushMock).toHaveBeenCalledWith('/search');
  });

  it('a failed load is an error state with a retry, not "no saved searches"', async () => {
    list.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<SavedSearchesScreen />);
    expect(await screen.findByText('Kayıtlı aramalar yüklenemedi')).toBeOnTheScreen();
    expect(screen.queryByText('Kayıtlı Arama Yok')).toBeNull();
    list.mockResolvedValue(page([search()]));
    await act(async () => {
      fireEvent.press(screen.getByText('Tekrar Dene'));
    });
    expect(await screen.findByText('BMW 1/18')).toBeOnTheScreen();
  });

  it('a guest gets the sign-in gate and nothing is requested', () => {
    setSession(undefined, false);
    renderWithProviders(<SavedSearchesScreen />);
    expect(screen.getByText('Aramanızı kaydetmek için giriş yapın')).toBeOnTheScreen();
    expect(list).not.toHaveBeenCalled();
  });

  it('delete asks first: cancel keeps it, confirm calls the API and shows the deleted toast', async () => {
    list.mockResolvedValue(page([search()]));
    remove.mockResolvedValue({ data: undefined });
    renderWithProviders(<SavedSearchesScreen />);
    await screen.findByText('BMW 1/18');

    fireEvent.press(screen.getByTestId('saved-search-delete'));
    expect(alertMock).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertMock.mock.calls[0];
    expect(title).toBe('Aramayı sil');
    expect(message).toBe('"BMW 1/18" aramasını silmek istediğinize emin misiniz?');
    await act(async () => buttons.find((b: any) => b.style === 'cancel').onPress());
    expect(remove).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('saved-search-delete'));
    list.mockResolvedValue(page([]));
    await act(async () => alertMock.mock.calls[1][2].find((b: any) => b.style === 'destructive').onPress());
    await waitFor(() => expect(remove).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Arama silindi'));
    // The list is refetched after the delete.
    expect(await screen.findByText('Kayıtlı Arama Yok')).toBeOnTheScreen();
  });

  it('delete failure is a toast', async () => {
    list.mockResolvedValue(page([search()]));
    remove.mockRejectedValue(new Error('x'));
    renderWithProviders(<SavedSearchesScreen />);
    await screen.findByText('BMW 1/18');
    fireEvent.press(screen.getByTestId('saved-search-delete'));
    await act(async () => alertMock.mock.calls[0][2].find((b: any) => b.style === 'destructive').onPress());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
  });

  it('Run opens /search with the params of the vendored savedSearchToRouteParams (round trip)', async () => {
    const saved = search({
      query: {
        search: 'bmw',
        categoryId: 'c1',
        brandId: 'b1',
        carModelId: 'm1',
        color: 'black,red',
        tradeOnly: true,
        preOrder: true,
        attrGroups: JSON.stringify({ series: ['gt', 'sx'] }),
        sortBy: 'price_asc',
      },
      labels: { categoryId: 'Diecast', brandId: 'BMW', carModelId: 'M3' },
    });
    list.mockResolvedValue(page([saved]));
    renderWithProviders(<SavedSearchesScreen />);
    await screen.findByText('BMW 1/18');

    fireEvent.press(screen.getByTestId('saved-search-run'));

    const expected = savedSearchToRouteParams(saved.query, saved.labels);
    expect(pushMock).toHaveBeenCalledWith({ pathname: '/search', params: expected });
    // It emits the names `/search` reads, never the old mobile ones.
    expect(expected).toMatchObject({ search: 'bmw', tradeOnly: 'true', 'attr.series': 'gt,sx', category: 'Diecast' });
    expect(expected).not.toHaveProperty('q');
    expect(expected).not.toHaveProperty('tradeAvailable');
    // ... and the search screen reads every one of them back.
    expect(filtersFromSearchParams(expected)).toMatchObject({
      search: 'bmw',
      categoryId: 'c1',
      category: 'Diecast',
      brandId: 'b1',
      brand: 'BMW',
      carModelId: 'm1',
      carModel: 'M3',
      colors: ['black', 'red'],
      tradeOnly: true,
      preOrder: true,
      customAttributes: { series: ['gt', 'sx'] },
      sortBy: 'price_asc',
    });
  });
});

describe('fetchAllSavedSearches', () => {
  beforeEach(() => list.mockReset());

  it('loads every page and keeps an id that shifted onto two pages once', async () => {
    list
      .mockResolvedValueOnce(page([search({ id: 'a' }), search({ id: 'b' })], 3, 1, 2))
      .mockResolvedValueOnce(page([search({ id: 'b' }), search({ id: 'c' })], 3, 2, 2));
    const result = await fetchAllSavedSearches();
    expect(list.mock.calls.map((c) => c[0])).toEqual([1, 2]);
    expect(result.items.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(result.total).toBe(3);
  });

  it('a single page makes a single request', async () => {
    list.mockResolvedValueOnce(page([search()]));
    expect((await fetchAllSavedSearches()).items).toHaveLength(1);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
