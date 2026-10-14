/**
 * Filtre sayfası — üretici değişince yalnız üreticiye bağlı özel grup
 * seçimleri sıfırlanır; genel gruplar (Nadirlik vb., `manufacturerSlug: null`)
 * kalır (delta 19, C-3.6). Genel grup üreticisiz de listelenir.
 * Alttan açılan panel: [Temizle] [N Sonuç Göster] gövdenin dışında sabit footer'da; uzun
 * listeler ilk 8 satır + "Tümünü göster".
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import ProductFilterSheet from '../ProductFilterSheet';
import { EMPTY_FILTERS, keepGeneralAttributeSelections } from '../../utils/productFilters';
import type { ProductFilterOptions } from '../../hooks/useProductFilterOptions';

const GENERAL = {
  slug: 'rarity',
  name: 'Nadirlik',
  manufacturerSlug: null,
  attributes: [{ slug: 'rare', label: 'Nadir', color: null }],
};
const SCOPED = {
  slug: 'segment',
  name: 'Segment',
  manufacturerSlug: 'hot-wheels',
  attributes: [{ slug: 'premium', label: 'Premium', color: null }],
};

const options = (over: Partial<ProductFilterOptions> = {}): ProductFilterOptions => ({
  categories: [],
  brands: [],
  manufacturers: [
    { id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' },
    { id: 'm2', name: 'Majorette', slug: 'majorette' },
  ],
  scales: [],
  materials: [],
  customAttributes: [GENERAL, SCOPED],
  isLoading: false,
  ...over,
});

describe('keepGeneralAttributeSelections', () => {
  it('genel grup seçimi kalır, üreticiye bağlı ve bilinmeyen düşer', () => {
    expect(
      keepGeneralAttributeSelections(
        { rarity: ['rare'], segment: ['premium'], ghost: ['x'] },
        [GENERAL, SCOPED],
      ),
    ).toEqual({ rarity: ['rare'] });
  });
  it('seçim yoksa boş nesne', () => {
    expect(keepGeneralAttributeSelections(undefined, [GENERAL])).toEqual({});
  });
});

describe('ProductFilterSheet · üretici değişimi', () => {
  const setup = (filters = {}, opts = options()) => {
    const onChange = jest.fn();
    render(
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        filters={{
          ...EMPTY_FILTERS,
          manufacturerId: 'm1',
          manufacturer: 'Hot Wheels',
          customAttributes: { rarity: ['rare'], segment: ['premium'] },
          ...filters,
        }}
        onChange={onChange}
        onClear={jest.fn()}
        options={opts}
        resultCount={0}
      />,
    );
    return onChange;
  };

  it('başka üreticiye geçince genel seçim kalır, üreticiye bağlı sıfırlanır', () => {
    const onChange = setup();
    fireEvent.press(screen.getByText('Majorette'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturerId: 'm2',
        customAttributes: { rarity: ['rare'] },
      }),
    );
  });

  it('üretici seçimi kaldırılınca da genel seçim kalır', () => {
    const onChange = setup();
    fireEvent.press(screen.getByText('Hot Wheels'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ manufacturerId: '', customAttributes: { rarity: ['rare'] } }),
    );
  });

  it('üretici seçilmeden genel grup listelenir', () => {
    setup({ manufacturerId: '', manufacturer: '', customAttributes: {} }, options({ customAttributes: [GENERAL] }));
    expect(screen.getByText('Nadirlik')).toBeTruthy();
    expect(screen.getByText('Nadir')).toBeTruthy();
  });
});

describe('ProductFilterSheet · alt çubuk (footer)', () => {
  const renderSheet = (over: Partial<React.ComponentProps<typeof ProductFilterSheet>> = {}) => {
    const props = {
      visible: true,
      onClose: jest.fn(),
      onClear: jest.fn(),
      onChange: jest.fn(),
      filters: EMPTY_FILTERS,
      options: options(),
      resultCount: 549,
      ...over,
    };
    render(<ProductFilterSheet {...props} />);
    return props;
  };

  it('[Temizle] [549 Sonuç Göster] gövdenin DIŞINDA sabit alt çubukta, ButtonRow içinde tek satır', () => {
    renderSheet();
    const footer = screen.getByTestId('product-filter-sheet-footer');
    const apply = within(footer).getByTestId('product-filter-apply');
    expect(within(apply).getByText('549 Sonuç Göster').props.numberOfLines).toBe(1);
    expect(within(footer).getByTestId('product-filter-clear')).toBeTruthy();
    // ButtonRow: sığmazsa alt alta tam genişlik, etiket asla sarmaz.
    expect(within(footer).getByTestId('product-filter-footer')).toBeTruthy();
    // Kaydırılan gövdede değil (eskiden ScrollView'in altında kesiliyordu).
    expect(
      within(screen.getByTestId('product-filter-sheet-body')).queryByTestId('product-filter-apply'),
    ).toBeNull();
  });

  it('Temizle onClear, Sonuç Göster paneli kapatır; sayım yüklenirken yükleniyor etiketi', () => {
    const props = renderSheet({ countLoading: true });
    expect(screen.getByText('Sonuçlar yükleniyor…')).toBeTruthy();
    fireEvent.press(screen.getByTestId('product-filter-clear'));
    expect(props.onClear).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('product-filter-apply'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('panel kapalıyken içerik bağlı değil', () => {
    renderSheet({ visible: false });
    expect(screen.queryByTestId('product-filter-sheet')).toBeNull();
    expect(screen.queryByText('Majorette')).toBeNull();
  });
});

describe('ProductFilterSheet · kaldırılan filtreler', () => {
  it('Model bölümü, Ön Sipariş, Limited Edition ve Set/Paket seçenekleri yok', () => {
    render(
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        onClear={jest.fn()}
        onChange={jest.fn()}
        filters={EMPTY_FILTERS}
        options={options()}
        resultCount={0}
      />,
    );
    expect(screen.queryByTestId('filter-model')).toBeNull();
    for (const label of ['Model', 'Ön Sipariş', 'Limited Edition', 'Set / Paket']) {
      expect(screen.queryByText(label)).toBeNull();
    }
    // Kalan seçenekler yerinde.
    expect(screen.getByText('Sadece takas yapılabilir ürünleri göster')).toBeTruthy();
  });
});

describe('ProductFilterSheet · uzun seçenek listeleri', () => {
  const brands = Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, name: `Marka ${i}`, slug: `m${i}` }));
  const renderBrands = (filters = EMPTY_FILTERS) =>
    render(
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        onClear={jest.fn()}
        onChange={jest.fn()}
        filters={filters}
        options={options({ brands } as Partial<ProductFilterOptions>)}
        resultCount={0}
      />,
    );

  it('ilk 8 satır + "Tümünü göster (20)"; açınca hepsi; seçili satır dilim dışında da görünür', () => {
    renderBrands({ ...EMPTY_FILTERS, brandId: 'b15', brand: 'Marka 15' });
    expect(screen.getByText('Marka 7')).toBeTruthy();
    expect(screen.queryByText('Marka 8')).toBeNull();
    expect(screen.getByText('Marka 15')).toBeTruthy();
    fireEvent.press(screen.getByText('Tümünü göster (20)'));
    expect(screen.getByText('Marka 19')).toBeTruthy();
    fireEvent.press(screen.getByText('Daha az göster'));
    expect(screen.queryByText('Marka 19')).toBeNull();
  });

  it('arama listeyi süzer; eşleşme yoksa boş durum', () => {
    renderBrands();
    fireEvent.changeText(screen.getByTestId('filter-brand-search'), '19');
    expect(screen.getByText('Marka 19')).toBeTruthy();
    expect(screen.queryByText('Marka 1')).toBeNull();
    fireEvent.changeText(screen.getByTestId('filter-brand-search'), 'yok');
    expect(screen.getByTestId('filter-brand-empty')).toBeTruthy();
  });
});
