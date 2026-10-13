/**
 * Ortak liste parçaları: ProductGrid (iskelet / tek boş durum / hata), ProductSortModal (web sırası),
 * ProductListControls (filtre sayısı + ızgara/liste), ActiveFilterChips, SimilarProductsCard.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductGrid } from '../ProductGrid';
import { ProductSortModal } from '../ProductSortModal';
import { ProductListControls } from '../ProductListControls';
import { ActiveFilterChips } from '../ActiveFilterChips';
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

  it('yükleniyor: iskelet (spinner değil), ürün yok', () => {
    render(<ProductGrid items={items} loading />);
    expect(screen.getByTestId('product-grid-skeleton')).toBeTruthy();
    expect(screen.queryByText('Ürün A')).toBeNull();
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
    render(<ProductGrid items={[]} emptyTitle="Bu üreticiye ait ürün yok" />);
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

  it('her çip kaldırılabilir; "Filtreleri Temizle" hepsini temizler', () => {
    const onRemove = jest.fn();
    const onClear = jest.fn();
    render(<ActiveFilterChips chips={[{ key: 'k', label: 'Hot Wheels', onRemove }]} onClear={onClear} />);
    expect(screen.getByText('Filtreler:')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Kaldır: Hot Wheels'));
    expect(onRemove).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Filtreleri Temizle'));
    expect(onClear).toHaveBeenCalled();
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
});
