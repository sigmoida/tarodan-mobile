/**
 * Kategoriler ekranı: sol ray (gruplar; boş grup gizli, ilk açılışta ilk dolu grup seçili) + sağ
 * 3 sütunlu ızgara; her grup doğru `/listings` parametreleriyle açar; alt kategori inişi (geri
 * dönüşlü); yükleme iskeleti / hata + tekrar dene / boş durum.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const mockCatalog = jest.fn();
jest.mock('../_hooks/useCategoriesCatalog', () => ({ useCategoriesCatalog: () => mockCatalog() }));

import CategoriesScreen from '../index';
import { CATEGORY_GRID_COLUMNS } from '../_components/CategoryGrid';

const refetch = jest.fn();
const loaded = {
  categories: [
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
  ],
  manufacturers: [
    { id: 'm1', name: 'Bburago', _count: { products: 3 } },
    { id: 'm2', name: 'Hot Wheels', logo: 'https://cdn/hw.png', _count: { products: 12 } },
  ],
  scales: ['1:64', '1:18'],
  isLoading: false,
  isRefetching: false,
  error: null,
  refetch,
};

beforeEach(() => {
  resetRouterMocks();
  refetch.mockClear();
  mockCatalog.mockReturnValue(loaded);
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

const selectGroup = (key: string) => fireEvent.press(screen.getByTestId(`categories-rail-${key}`));
/** Çift dokunuş kilidini (800ms) bırak: aynı testte art arda itmeler için. */
const unlock = () => act(() => void jest.advanceTimersByTime(900));
const tab = (key: string) => screen.getByTestId(`categories-rail-${key}`);

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
    expect(screen.getByTestId('categories-title').props.children).toBe('Keşfet');
    expect(CATEGORY_GRID_COLUMNS).toBe(3);
  });

  it('verisi olmayan grup rayda gizlenir; seçili grup yoksa ilk dolu gruba düşer', () => {
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

  it('Kategoriler: yaprak kutu /listings?categoryId&category açar; ilanı olmayan alt ağaç gizli', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    expect(screen.getByTestId('categories-title').props.children).toBe('Kategoriler');
    fireEvent.press(screen.getByTestId('categories-tile-category:c1'));
    expect(pushMock).toHaveBeenCalledWith('/listings?categoryId=c1&category=Otomobil');
  });

  it('alt kategorisi olan kutu alt düzeye iner: başlık kategori adı, "Tümü" + alt kutular; geri ile döner', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2'));
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('categories-title').props.children).toBe('Ticari');
    expect(screen.queryByTestId('categories-tile-category:c1')).toBeNull();
    expect(screen.queryByTestId('categories-tile-category:c2b')).toBeNull();
    fireEvent.press(screen.getByTestId('categories-tile-category:c2:all'));
    expect(pushMock).toHaveBeenLastCalledWith('/listings?categoryId=c2&category=Ticari');
    unlock();
    fireEvent.press(screen.getByTestId('categories-tile-category:c2a'));
    expect(pushMock).toHaveBeenLastCalledWith('/listings?categoryId=c2a&category=Kamyon');

    fireEvent.press(screen.getByTestId('categories-back'));
    expect(screen.getByTestId('categories-title').props.children).toBe('Kategoriler');
    expect(screen.getByTestId('categories-tile-category:c1')).toBeTruthy();
    expect(screen.queryByTestId('categories-back')).toBeNull();
  });

  it('grup değişince alt kategori inişi sıfırlanır', () => {
    render(<CategoriesScreen />);
    selectGroup('categories');
    fireEvent.press(screen.getByTestId('categories-tile-category:c2'));
    selectGroup('scales');
    selectGroup('categories');
    expect(screen.getByTestId('categories-title').props.children).toBe('Kategoriler');
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
    fireEvent.press(screen.getByTestId('categories-footer-link'));
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
  it('ilk yüklemede iskelet (ray + ızgara), içerik yok', () => {
    mockCatalog.mockReturnValue({ ...loaded, isLoading: true });
    render(<CategoriesScreen />);
    expect(screen.getByTestId('categories-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('categories-rail')).toBeNull();
  });

  it('hata: PageShell hata durumu + tekrar dene yeniden yükler', () => {
    mockCatalog.mockReturnValue({ ...loaded, categories: [], manufacturers: [], scales: [], error: new Error('x') });
    render(<CategoriesScreen />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.queryByTestId('categories-rail')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
