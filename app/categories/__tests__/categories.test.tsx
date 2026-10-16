/**
 * Kategoriler ekranı: sol ray (gruplar; boş grup gizli, ilk açılışta ilk dolu grup seçili) + sağ
 * 2 sütunlu ızgara; her grup doğru `/listings` parametreleriyle açar; alt kategori inişi (kırıntıyla
 * geri; katalog yenilenince yol sıfırlanır); iskelet / grup bazında hata + tekrar dene / çekip yenile.
 */
import React from 'react';
import { RefreshControl } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const mockCatalog = jest.fn();
jest.mock('../_hooks/useCategoriesCatalog', () => ({ useCategoriesCatalog: () => mockCatalog() }));

import CategoriesScreen from '../index';
import { CATEGORY_GRID_COLUMNS } from '../_lib/layout';

const retry = { categories: jest.fn(), manufacturers: jest.fn(), scales: jest.fn() };
const retryAll = jest.fn();
const categories = [
  { id: 'c1', name: 'Otomobil', productCount: 4, children: [] },
  {
    id: 'c2',
    name: 'Ticari',
    productCount: 0,
    children: [
      { id: 'c2a', name: 'Kamyon', productCount: 2, children: [] },
      { id: 'c2b', name: 'Boş Alt', productCount: 0, children: [] },
    ],
  },
  { id: 'c3', name: 'Boş Kategori', productCount: 0, children: [] },
];
const loaded = {
  categories,
  manufacturers: [
    { id: 'm1', name: 'Bburago', _count: { products: 3 } },
    { id: 'm2', name: 'Hot Wheels', logo: 'https://cdn/hw.png', _count: { products: 12 } },
  ],
  scales: ['1:64', '1:18'],
  status: { categories: 'ready', manufacturers: 'ready', scales: 'ready' },
  retry,
  retryAll,
  isLoading: false,
  isRefetching: false,
};

beforeEach(() => {
  resetRouterMocks();
  Object.values(retry).forEach((f) => f.mockClear());
  retryAll.mockClear();
  mockCatalog.mockReturnValue(loaded);
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

const selectGroup = (key: string) => fireEvent.press(screen.getByTestId(`categories-rail-${key}`));
/** Çift dokunuş kilidini (800ms) bırak: aynı testte art arda itmeler için. */
const unlock = () => act(() => void jest.advanceTimersByTime(900));
const tab = (key: string) => screen.getByTestId(`categories-rail-${key}`);
const headerText = () => within(screen.getByTestId('categories-header'));

describe('Kategoriler ekranı — düzen', () => {
  it('PageShell başlığı "Kategoriler"; rayda 4 grup, ilk dolu grup (Keşfet) seçili', () => {
    render(<CategoriesScreen />);
    expect(screen.getAllByText('Kategoriler').length).toBeGreaterThan(0);
    const rail = within(screen.getByTestId('categories-rail'));
    expect(rail.getAllByRole('tab').map((x) => x.props.accessibilityLabel)).toEqual([
      'Keşfet',
      'Kategoriler',
      'Üreticiler',
      'Ölçek',
    ]);
    expect(tab('explore').props.accessibilityState).toEqual({ selected: true });
    expect(tab('scales').props.accessibilityState).toEqual({ selected: false });
    expect(headerText().getByText('Keşfet')).toBeTruthy();
    expect(CATEGORY_GRID_COLUMNS).toBe(2);
  });

  it('verisi olmayan (hazır) grup rayda gizlenir', () => {
    mockCatalog.mockReturnValue({ ...loaded, categories: [], scales: [] });
    render(<CategoriesScreen />);
    expect(screen.queryByTestId('categories-rail-categories')).toBeNull();
    expect(screen.queryByTestId('categories-rail-scales')).toBeNull();
    expect(screen.getByTestId('categories-rail-manufacturers')).toBeTruthy();
    expect(screen.getByTestId('categories-rail-explore')).toBeTruthy();
  });
});

describe('Kategoriler ekranı — hedefler', () => {
  it('Keşfet kutuları web ile aynı adresleri açar', () => {
    render(<CategoriesScreen />);
    const cases: Array<[string, string]> = [
      ['explore:all', '/listings'],
      ['explore:new', '/listings?sortBy=created_desc'],
      ['explore:best', '/listings?sortBy=view_count_desc'],
      ['explore:sale', '/listings?discountOnly=true'],
      ['explore:collections', '/collections'],
    ];
    for (const [id, href] of cases) {
      fireEvent.press(screen.getByTestId(`categories-tile-${id}`));
      expect(pushMock).toHaveBeenLastCalledWith(href);
      unlock();
    }
  });

  it('Kategoriler: HEPSİ gösterilir (0 ilanlı da, web gibi); yaprak kutu /listings?categoryId&category açar', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    expect(headerText().getByText('Kategoriler')).toBeTruthy();
    expect(screen.getByTestId('categories-tile-category:c3')).toBeTruthy();
    fireEvent.press(screen.getByTestId('categories-tile-category:c1'));
    expect(pushMock).toHaveBeenCalledWith('/listings?categoryId=c1&category=Otomobil');
  });

  it('alt kategorisi olan kutu alt düzeye iner: başlık kategori adı, kırıntı "‹ Kategoriler", "Tümü" + tüm alt kutular; kırıntı ile döner', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2'));
    expect(pushMock).not.toHaveBeenCalled();
    expect(headerText().getByText('Ticari')).toBeTruthy();
    expect(screen.queryByTestId('categories-tile-category:c1')).toBeNull();
    expect(screen.getByTestId('categories-tile-category:c2b')).toBeTruthy();
    const crumb = screen.getByTestId('categories-parent-crumb');
    expect(crumb.props.accessibilityLabel).toBe('Üst kategoriye dön: Kategoriler');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2:all'));
    expect(pushMock).toHaveBeenLastCalledWith('/listings?categoryId=c2&category=Ticari');
    unlock();
    fireEvent.press(screen.getByTestId('categories-tile-category:c2a'));
    expect(pushMock).toHaveBeenLastCalledWith('/listings?categoryId=c2a&category=Kamyon');

    fireEvent.press(crumb);
    expect(headerText().getByText('Kategoriler')).toBeTruthy();
    expect(screen.getByTestId('categories-tile-category:c1')).toBeTruthy();
    expect(screen.queryByTestId('categories-parent-crumb')).toBeNull();
  });

  it('grup değişince alt kategori inişi sıfırlanır', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2'));
    selectGroup('scales');
    selectGroup('categories');
    expect(headerText().getByText('Kategoriler')).toBeTruthy();
    expect(screen.queryByTestId('categories-parent-crumb')).toBeNull();
  });

  it('katalog yenilenip inilen kategori kalkarsa köke döner (bulunamayan yol sıfırlanır)', () => {
    const view = render(<CategoriesScreen />);
    selectGroup('categories');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2'));
    expect(screen.getByTestId('categories-parent-crumb')).toBeTruthy();
    mockCatalog.mockReturnValue({ ...loaded, categories: [categories[0]!, categories[2]!] });
    view.rerender(<CategoriesScreen />);
    expect(screen.queryByTestId('categories-parent-crumb')).toBeNull();
    expect(screen.getByTestId('categories-tile-category:c1')).toBeTruthy();
  });

  it('Üreticiler: ilan sayısına göre sıralı, ilan sayısı görünür; kutu manufacturer + manufacturerId açar; altta "Tüm Üreticiler" → /ureticiler', () => {
    render(<CategoriesScreen />);
    selectGroup('manufacturers');
    const grid = within(screen.getByTestId('categories-grid'));
    const labels = grid.getAllByText(/Hot Wheels|Bburago/).map((x) => x.props.children);
    expect(labels).toEqual(['Hot Wheels', 'Bburago']);
    expect(grid.getByText('12 ürün')).toBeTruthy();
    fireEvent.press(screen.getByTestId('categories-tile-manufacturer:m2'));
    expect(pushMock).toHaveBeenLastCalledWith('/listings?manufacturer=Hot%20Wheels&manufacturerId=m2');
    unlock();
    const link = screen.getByTestId('categories-footer-link');
    expect(link.props.accessibilityLabel).toBe('Tüm Üreticiler');
    fireEvent.press(link);
    expect(pushMock).toHaveBeenLastCalledWith('/ureticiler');
  });

  it('Ölçek: kutu /listings?scale= açar', () => {
    render(<CategoriesScreen />);
    selectGroup('scales');
    fireEvent.press(screen.getByTestId('categories-tile-scale:1:64'));
    expect(pushMock).toHaveBeenCalledWith('/listings?scale=1%3A64');
  });

  it('çift dokunuş tek /listings açar', () => {
    render(<CategoriesScreen />);
    fireEvent.press(screen.getByTestId('categories-tile-explore:all'));
    fireEvent.press(screen.getByTestId('categories-tile-explore:new'));
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('kutular erişilebilir etiketli (üretici: ad + ilan sayısı)', () => {
    render(<CategoriesScreen />);
    selectGroup('manufacturers');
    expect(screen.getByTestId('categories-tile-manufacturer:m2').props.accessibilityLabel).toBe('Hot Wheels, 12 ürün');
  });
});

describe('Kategoriler ekranı — durumlar', () => {
  it('veri yokken ilk yüklemede tam ekran iskelet', () => {
    mockCatalog.mockReturnValue({ ...loaded, categories: [], manufacturers: [], scales: [], isLoading: true });
    render(<CategoriesScreen />);
    expect(screen.getByTestId('categories-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('categories-rail')).toBeNull();
  });

  it('bir grup hâlâ yüklenirken ekran açılır: grup rayda, sağ alan ızgara iskeleti (ölçekler tam ekranı bekletmez)', () => {
    mockCatalog.mockReturnValue({
      ...loaded,
      scales: [],
      status: { ...loaded.status, scales: 'loading' },
    });
    render(<CategoriesScreen />);
    expect(screen.queryByTestId('categories-skeleton')).toBeNull();
    selectGroup('scales');
    expect(screen.getByTestId('categories-grid-skeleton')).toBeTruthy();
  });

  it('bir kaynak düşerse yalnız o grup hata gösterir: rayda "Yüklenemedi", sağda hata + tekrar dene o kaynağı yeniden dener; diğer gruplar çalışır', () => {
    mockCatalog.mockReturnValue({
      ...loaded,
      manufacturers: [],
      status: { ...loaded.status, manufacturers: 'error' },
    });
    render(<CategoriesScreen />);
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.getByTestId('categories-rail-manufacturers-failed')).toBeTruthy();
    expect(tab('manufacturers').props.accessibilityLabel).toBe('Üreticiler, Yüklenemedi');
    selectGroup('manufacturers');
    expect(screen.getByTestId('categories-group-error')).toBeTruthy();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(retry.manufacturers).toHaveBeenCalledTimes(1);
    expect(retry.categories).not.toHaveBeenCalled();
    selectGroup('scales');
    expect(screen.queryByTestId('categories-group-error')).toBeNull();
    expect(screen.getByTestId('categories-tile-scale:1:64')).toBeTruthy();
  });

  it('çekip yenile tüm kaynakları yeniden yükler', () => {
    render(<CategoriesScreen />);
    act(() => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(retryAll).toHaveBeenCalledTimes(1);
  });
});
