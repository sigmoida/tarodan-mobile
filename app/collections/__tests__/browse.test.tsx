/**
 * Koleksiyon tarama (web `/collections` paritesi): API parametreleri (`sortBy`/`search`/`categoryId`,
 * eski `sort`/`q`/'newest' değil), debounce'lu sunucu araması, sıralama + kategori SelectSheet'leri,
 * "Herkese açık / Benim" sekmeleri (Benim yalnız girişli) ve sonsuz kaydırma.
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  collectionsApi: { browse: jest.fn(), getMyCollections: jest.fn() },
  categoriesApi: { getAll: jest.fn() },
}));
import { collectionsApi, categoriesApi } from '@/lib/api';

let mockAuth: Record<string, unknown> = { isAuthenticated: false, user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import CollectionsScreen from '../index';

const browseMock = collectionsApi.browse as jest.Mock;
const mineMock = collectionsApi.getMyCollections as jest.Mock;
const categoriesMock = categoriesApi.getAll as jest.Mock;

const col = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  itemCount: 1,
  viewCount: 0,
  likeCount: 0,
  userName: 'Ali',
  ...extra,
});

function lastBrowseParams() {
  return browseMock.mock.calls[browseMock.mock.calls.length - 1][0];
}

describe('Koleksiyon tarama', () => {
  beforeEach(() => {
    browseMock.mockReset();
    mineMock.mockReset();
    categoriesMock.mockReset();
    mockAuth = { isAuthenticated: false, user: null };
    browseMock.mockResolvedValue({
      data: { collections: [col('c1', 'Ferrari Koleksiyonu')], total: 1, page: 1, pageSize: 20 },
    });
    categoriesMock.mockResolvedValue({
      data: [{ id: 'cat-1', name: 'Arabalar', slug: 'arabalar', children: [{ id: 'cat-2', name: 'Klasik' }] }],
    });
    mineMock.mockResolvedValue({ data: { collections: [col('m1', 'Benim Garajım')], total: 1 } });
  });

  it('misafir: sekme yok; ilk istek web parametreleriyle (sortBy=popular, sayfa 1)', async () => {
    renderWithProviders(<CollectionsScreen />);
    expect(await screen.findByText('Ferrari Koleksiyonu')).toBeOnTheScreen();
    expect(screen.queryByTestId('collections-tabs')).toBeNull();
    expect(lastBrowseParams()).toEqual({ sortBy: 'popular', page: 1, pageSize: 20 });
    expect(lastBrowseParams()).not.toHaveProperty('sort');
    expect(lastBrowseParams()).not.toHaveProperty('q');
  });

  it('arama sunucuya debounce ile `search` olarak gider', async () => {
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Ferrari Koleksiyonu');
    fireEvent.changeText(screen.getByTestId('collections-search'), '  porsche ');
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ search: 'porsche', sortBy: 'popular' }));
    // Temizle → arama parametresi düşer.
    fireEvent.press(screen.getByTestId('collections-search-clear'));
    await waitFor(() => expect(lastBrowseParams()).not.toHaveProperty('search'));
  });

  it('sıralama sheet\'i: A-Z → sortBy=name, düğme seçili sıralamayı gösterir', async () => {
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Ferrari Koleksiyonu');
    expect(within(screen.getByTestId('sort-button')).getByText('Popüler')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sort-button'));
    fireEvent.press(await screen.findByTestId('collections-sort-sheet-option-name'));
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ sortBy: 'name' }));
    fireEvent.press(screen.getByTestId('sort-button'));
    fireEvent.press(await screen.findByTestId('collections-sort-sheet-option-items_desc'));
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ sortBy: 'items_desc' }));
  });

  it('kategori sheet\'i: seçim `categoryId` gönderir, kaldırılabilir çip çıkar', async () => {
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Ferrari Koleksiyonu');
    fireEvent.press(screen.getByTestId('filter-button'));
    fireEvent.press(await screen.findByTestId('collections-category-sheet-option-cat-2'));
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ categoryId: 'cat-2' }));
    expect(within(screen.getByTestId('active-filter-chips')).getByText('— Klasik')).toBeOnTheScreen();
    expect(categoriesMock).toHaveBeenCalledWith({ refresh: '1' });
  });

  it('sonsuz kaydırma: liste sonunda sonraki sayfa istenir', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => col(`p${i}`, `Koleksiyon ${i}`));
    browseMock.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({
        data:
          page === 1
            ? { collections: page1, total: 21, page: 1, pageSize: 20 }
            : { collections: [col('p20', 'Son Koleksiyon')], total: 21, page: 2, pageSize: 20 },
      }),
    );
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Koleksiyon 0');
    fireEvent(screen.getByTestId('collections-list'), 'onEndReached');
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ page: 2, pageSize: 20 }));
  });

  it('sonraki sayfa yüklenemezse liste altında "Tekrar dene" satırı; basınca yeniden ister', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => col(`p${i}`, `Koleksiyon ${i}`));
    let failSecond = true;
    browseMock.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) return Promise.resolve({ data: { collections: page1, total: 21, page: 1, pageSize: 20 } });
      if (failSecond) return Promise.reject(new Error('500'));
      return Promise.resolve({
        data: { collections: [col('p20', 'Son Koleksiyon')], total: 21, page: 2, pageSize: 20 },
      });
    });
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Koleksiyon 0');
    fireEvent(screen.getByTestId('collections-list'), 'onEndReached');
    expect(await screen.findByTestId('collections-next-page-retry')).toBeOnTheScreen();
    // Hata durumunda kaydırma otomatik yeniden denemez (yalnız düğme).
    const callsAfterFail = browseMock.mock.calls.length;
    fireEvent(screen.getByTestId('collections-list'), 'onEndReached');
    expect(browseMock.mock.calls.length).toBe(callsAfterFail);
    failSecond = false;
    fireEvent.press(screen.getByText('Tekrar Dene'));
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ page: 2 }));
    await waitFor(() => expect(screen.queryByTestId('collections-next-page-retry')).toBeNull());
  });

  it('girişli: "Koleksiyonlarım" sekmesi /collections/me listeler; kategori filtresi gizli', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'u1', membershipTier: 'free' } };
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Ferrari Koleksiyonu');
    expect(screen.getByText('Herkese Açık')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('collections-tabs-mine'));
    expect(await screen.findByText('Benim Garajım')).toBeOnTheScreen();
    expect(mineMock).toHaveBeenCalled();
    expect(screen.queryByText('Ferrari Koleksiyonu')).toBeNull();
    expect(screen.queryByTestId('filter-button')).toBeNull();
  });

  it('istek hata verirse ErrorState; tekrar dene yeniden ister', async () => {
    browseMock.mockRejectedValueOnce(new Error('500'));
    renderWithProviders(<CollectionsScreen />);
    expect(await screen.findByTestId('error-state')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Ferrari Koleksiyonu')).toBeOnTheScreen();
  });

  it('arama değişimi çekip-yenile göstergesini döndürmez (yalnız kullanıcı yenilemesi)', async () => {
    renderWithProviders(<CollectionsScreen />);
    await screen.findByText('Ferrari Koleksiyonu');
    let resolveNext: ((v: unknown) => void) | undefined;
    browseMock.mockImplementationOnce(() => new Promise((r) => (resolveNext = r)));
    fireEvent.changeText(screen.getByTestId('collections-search'), 'porsche');
    await waitFor(() => expect(lastBrowseParams()).toMatchObject({ search: 'porsche' }));
    const list = screen.getByTestId('collections-list');
    expect(list.props.refreshControl.props.refreshing).toBe(false);
    resolveNext?.({ data: { collections: [col('c2', 'Porsche')], total: 1, page: 1, pageSize: 20 } });
    expect(await screen.findByText('Porsche')).toBeOnTheScreen();
  });
});
