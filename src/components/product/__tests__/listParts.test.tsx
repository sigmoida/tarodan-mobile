/**
 * Ortak liste parçaları: ProductGrid (iskelet / tek boş durum / hata), ProductSortModal (web sırası),
 * ProductListControls (filtre sayısı + ızgara/liste), ActiveFilterChips, SimilarProductsCard.
 */
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
// Kartlardaki favori kalbi (`useProductCardFavorites`) React Query ister: provider'lı render.
import { renderWithProviders as render } from '@/test-utils';
import { ProductGrid } from '../ProductGrid';
import { ProductSortModal } from '../ProductSortModal';
import { ProductListControls } from '../ProductListControls';
import { ActiveFilterChips } from '../ActiveFilterChips';
import { ProductListToolbar } from '../ProductListToolbar';
import { SimilarProductsCard } from '../SimilarProductsCard';
import { buildSortOptions, buildListParams, EMPTY_FILTERS } from '@/utils/productFilters';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const items = [
  { id: 'a', title: 'Ürün A', price: 10, images: [] },
  { id: 'b', title: 'Ürün B', price: 20, images: [] },
  { id: 'c', title: 'Ürün C', price: 30, images: [] },
];

describe('ProductGrid', () => {
  it('ürünleri çizer', () => {
    render(<ProductGrid items={items} />);
    expect(screen.getByText('Ürün A')).toBeTruthy();
    expect(screen.getByText('Ürün C')).toBeTruthy();
  });

  it('yükleniyor: gecikmeden sonra iskelet (spinner değil), ürün yok', async () => {
    render(<ProductGrid items={items} loading />);
    // <150 ms süren yüklemede iskelet hiç çizilmez (useDelayedLoading).
    expect(screen.queryByTestId('product-grid-skeleton')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('product-grid-skeleton')).toBeTruthy());
    expect(screen.queryByText('Ürün A')).toBeNull();
  });

  it('sonraki sayfa hatası: "Tekrar dene" satırı, basınca yeniden ister', () => {
    const onRetry = jest.fn();
    render(<ProductGrid items={items} loadMoreFailed onRetryLoadMore={onRetry} />);
    fireEvent.press(screen.getByText(i18n.t('common.tryAgain')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('boş: tek boş durum metni; filtre varsa temizle düğmesi', () => {
    const onClear = jest.fn();
    const { unmount } = render(<ProductGrid items={[]} />);
    expect(screen.getByText('Henüz ilan yok')).toBeTruthy();
    expect(screen.getByText('İlk ilanı siz verin!')).toBeTruthy();
    unmount();
    render(<ProductGrid items={[]} filtered onClearFilters={onClear} />);
    expect(screen.getByText('Filtrelerinizi değiştirmeyi deneyin')).toBeTruthy();
    fireEvent.press(screen.getByText('Filtreleri Temizle'));
    expect(onClear).toHaveBeenCalled();
  });

  it('hata: ErrorState + yeniden dene', () => {
    const onRetry = jest.fn();
    render(<ProductGrid items={items} errorMessage="Yüklenemedi" onRetry={onRetry} />);
    expect(screen.getByText('Yüklenemedi')).toBeTruthy();
    expect(screen.queryByText('Ürün A')).toBeNull();
  });

  it('özel boş başlık (üreticinin ürünü yok)', () => {
    render(<ProductGrid items={[]} emptyTitle="Bu üreticiye ait ürün yok" emptySubtitle="Yakında yeni ürünler" />);
    expect(screen.getByText('Bu üreticiye ait ürün yok')).toBeTruthy();
  });
});

describe('sıralama', () => {
  const t = i18n.t.bind(i18n) as any;

  it('web sırası ve 9 seçenek (Önerilen … A-Z, Z-A)', () => {
    expect(buildSortOptions(t).map((o) => o.value)).toEqual([
      'relevance',
      'created_desc',
      'created_asc',
      'view_count_desc',
      'price_asc',
      'price_desc',
      'rating_desc',
      'title_asc',
      'title_desc',
    ]);
    const labels = buildSortOptions(t).map((o) => o.label);
    expect(labels[0]).toBe('Önerilen');
    expect(labels.slice(-2)).toEqual(['A-Z', 'Z-A']);
  });

  it("'Önerilen' sunucuya gönderilmez (web gibi); diğerleri gönderilir", () => {
    expect(buildListParams({ ...EMPTY_FILTERS, sortBy: 'relevance' }, 1, 24).sortBy).toBeUndefined();
    expect(buildListParams({ ...EMPTY_FILTERS, sortBy: 'title_asc' }, 1, 24).sortBy).toBe('title_asc');
  });

  it('ProductSortModal: seçince onSelect', () => {
    const onSelect = jest.fn();
    render(<ProductSortModal visible value="relevance" onSelect={onSelect} onClose={() => undefined} />);
    expect(screen.getByText('Z-A')).toBeTruthy();
    fireEvent.press(screen.getByText('A-Z'));
    expect(onSelect).toHaveBeenCalledWith('title_asc');
  });
});

describe('ProductListControls', () => {
  it('filtre sayısı rozeti, sıralama etiketi ve ızgara/liste anahtarı', () => {
    const onLayout = jest.fn();
    const onFilter = jest.fn();
    render(
      <ProductListControls
        sortLabel="Önerilen"
        onSort={() => undefined}
        onFilter={onFilter}
        filterCount={2}
        layout="grid"
        onLayoutChange={onLayout}
      />,
    );
    expect(screen.getByText('Önerilen')).toBeTruthy();
    expect(screen.getByTestId('filter-count')).toBeTruthy();
    fireEvent.press(screen.getByText('Filtreler'));
    expect(onFilter).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('layout-toggle'));
    expect(onLayout).toHaveBeenCalledWith('list');
  });

  it('onFilter yoksa yalnız sıralama', () => {
    render(<ProductListControls sortLabel="En Yeni" onSort={() => undefined} />);
    expect(screen.queryByText('Filtreler')).toBeNull();
    expect(screen.getByText('En Yeni')).toBeTruthy();
  });
});

describe('ActiveFilterChips', () => {
  it('çip yoksa hiçbir şey çizilmez', () => {
    render(<ActiveFilterChips chips={[]} onClear={() => undefined} />);
    expect(screen.queryByTestId('active-filter-chips')).toBeNull();
  });

  it('her çip kaldırılabilir; "Temizle" metin düğmesi hepsini temizler', () => {
    const onRemove = jest.fn();
    const onClear = jest.fn();
    render(<ActiveFilterChips chips={[{ key: 'k', label: 'Hot Wheels', onRemove }]} onClear={onClear} />);
    fireEvent.press(screen.getByLabelText('Kaldır: Hot Wheels'));
    expect(onRemove).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Temizle'));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('ProductListToolbar', () => {
  const chip = { key: 'brand', label: 'Hot Wheels', onRemove: jest.fn() };

  it('sıra: arama → denetimler → sonuç sayısı → çipler + Temizle', () => {
    const onClear = jest.fn();
    render(
      <ProductListToolbar
        search={<View testID="tb-search" />}
        sortLabel="En Yeni"
        onSort={() => undefined}
        onFilter={() => undefined}
        filterCount={1}
        layout="grid"
        onLayoutChange={() => undefined}
        resultLabel="61 ürün bulundu"
        chips={[chip]}
        onClearFilters={onClear}
      />,
    );
    const order = ['tb-search', 'product-list-controls', 'result-count', 'active-filter-chips'].map((id) =>
      JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.getByTestId('filter-button')).toBeTruthy();
    expect(screen.getByTestId('sort-button')).toBeTruthy();
    expect(screen.getByText('61 ürün bulundu')).toBeTruthy();
    fireEvent.press(screen.getByTestId('clear-filters'));
    expect(onClear).toHaveBeenCalled();
  });

  it('sonuç sayısı ve çip yoksa yalnız denetim satırı', () => {
    render(<ProductListToolbar sortLabel="En Yeni" onSort={() => undefined} />);
    expect(screen.getByTestId('product-list-controls')).toBeTruthy();
    expect(screen.queryByTestId('result-count')).toBeNull();
    expect(screen.queryByTestId('active-filter-chips')).toBeNull();
  });
});

describe('SimilarProductsCard', () => {
  it('boşken (emptyText yok) çizilmez; emptyText varsa metin', () => {
    const { rerender } = render(<SimilarProductsCard title="Benzer Ürünler" items={[]} />);
    expect(screen.queryByText('Benzer Ürünler')).toBeNull();
    rerender(<SimilarProductsCard title="Benzer Ürünler" items={[]} emptyText="Yok" />);
    expect(screen.getByText('Yok')).toBeTruthy();
  });

  it('dolu: kartlar', () => {
    render(<SimilarProductsCard title="Benzer Ürünler" items={items} />);
    expect(screen.getByText('Ürün B')).toBeTruthy();
  });

  describe('grid cells by window width', () => {
    const setWindow = (width: number, height: number) =>
      Dimensions.set({
        window: { width, height, scale: 2, fontScale: 2 },
        screen: { width, height, scale: 2, fontScale: 2 },
      });
    afterEach(() => setWindow(375, 667));
    // The cell is the nearest ancestor of the card title with a percentage width.
    const cellOf = (title: string) => {
      let node = screen.getByText(title).parent;
      while (node && typeof StyleSheet.flatten(node.props.style)?.width !== 'string') node = node.parent;
      return StyleSheet.flatten(node!.props.style);
    };

    it('phone: 48% cells, 4% gap on the second column, the third card starts a row', () => {
      render(<SimilarProductsCard title="Benzer Ürünler" items={items} />);
      expect(cellOf('Ürün A')).toMatchObject({ width: '48%', marginLeft: 0 });
      expect(cellOf('Ürün B')).toMatchObject({ width: '48%', marginLeft: '4%' });
      expect(cellOf('Ürün C')).toMatchObject({ width: '48%', marginLeft: 0 });
    });

    it('iPad 13" (1032 pt): four columns, the three cards share one row from the left', () => {
      setWindow(1032, 1376);
      render(<SimilarProductsCard title="Benzer Ürünler" items={items} />);
      expect(cellOf('Ürün A')).toMatchObject({ width: '22%', marginLeft: 0 });
      expect(cellOf('Ürün C')).toMatchObject({ width: '22%', marginLeft: '4%' });
    });
  });
});
