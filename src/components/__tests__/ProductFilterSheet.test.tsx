/**
 * Filtre sayfası — üretici değişince yalnız üreticiye bağlı özel grup
 * seçimleri sıfırlanır; genel gruplar (Nadirlik vb., `manufacturerSlug: null`)
 * kalır (delta 19, C-3.6). Genel grup üreticisiz de listelenir.
 * Alttan açılan panel: [Temizle] [N Sonuç Göster] gövdenin dışında sabit footer'da; uzun
 * listeler ilk 8 satır + "Tümünü göster".
 */
import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import ProductFilterSheet from '../ProductFilterSheet';
import {
  EMPTY_FILTERS,
  buildListParams,
  keepGeneralAttributeSelections,
  type ProductFilters,
} from '../../utils/productFilters';
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
  carModels: [],
  scales: [],
  materials: [],
  colors: [],
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

describe('ProductFilterSheet · web parity filters', () => {
  const MODELS = [
    { id: 'cm1', name: 'F40', slug: 'f40', brandId: 'b1' },
    { id: 'cm2', name: 'Countach', slug: 'countach', brandId: 'b2' },
  ];
  const COLORS = [
    { slug: 'red', label: 'Kırmızı', color: 'swatch-red' },
    { slug: 'black', label: 'Siyah', color: null },
  ];
  const BRANDS = [
    { id: 'b1', name: 'Ferrari', slug: 'ferrari' },
    { id: 'b2', name: 'Lamborghini', slug: 'lamborghini' },
  ];
  const setup = (filters = {}, opts = options({ carModels: MODELS, colors: COLORS, brands: BRANDS })) => {
    const onChange = jest.fn();
    render(
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        filters={{ ...EMPTY_FILTERS, ...filters }}
        onChange={onChange}
        onClear={jest.fn()}
        options={opts}
        resultCount={0}
      />,
    );
    return onChange;
  };

  it('lists every model without a brand and picks one with its id and name', () => {
    const onChange = setup();
    const list = screen.getByTestId('filter-model');
    expect(within(list).getByText('F40')).toBeTruthy();
    expect(within(list).getByText('Countach')).toBeTruthy();
    fireEvent.press(within(list).getByText('F40'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ carModelId: 'cm1', carModel: 'F40' }));
  });

  it('narrows the models to the selected brand', () => {
    setup({ brandId: 'b1', brand: 'Ferrari' });
    const list = screen.getByTestId('filter-model');
    expect(within(list).getByText('F40')).toBeTruthy();
    expect(within(list).queryByText('Countach')).toBeNull();
  });

  it('pressing the selected model clears it', () => {
    const onChange = setup({ carModelId: 'cm1', carModel: 'F40' });
    fireEvent.press(within(screen.getByTestId('filter-model')).getByText('F40'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ carModelId: '', carModel: '' }));
  });

  it('changing the brand resets the model (web handleBrandChange)', () => {
    const onChange = setup({ carModelId: 'cm1', carModel: 'F40' });
    fireEvent.press(within(screen.getByTestId('filter-brand')).getByText('Lamborghini'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: 'b2', carModelId: '', carModel: '' }),
    );
  });

  it('hides the model and colour sections when the catalog has none', () => {
    setup({}, options());
    expect(screen.queryByTestId('filter-model')).toBeNull();
    expect(screen.queryByTestId('filter-color')).toBeNull();
  });

  it('colours are multi-select: pressing adds to and removes from the list', () => {
    const onChange = setup({ colors: ['red'] });
    const list = screen.getByTestId('filter-color');
    expect(within(list).getAllByRole('checkbox').map((r) => r.props.accessibilityState.checked)).toEqual([
      true,
      false,
    ]);
    fireEvent.press(within(list).getByText('Siyah'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ colors: ['red', 'black'] }));
    fireEvent.press(within(list).getByText('Kırmızı'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ colors: [] }));
  });

  it('a picked colour outside the collapsed slice stays visible', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ slug: `c${i}`, label: `Renk ${i}`, color: null }));
    setup({ colors: ['c11'] }, options({ colors: many }));
    expect(within(screen.getByTestId('filter-color')).getByText('Renk 11')).toBeTruthy();
  });

  it.each([
    ['filter-pre-order', 'preOrder'],
    ['filter-limited', 'limited'],
    ['filter-set', 'set'],
    ['filter-discount-only', 'discountOnly'],
  ])('%s toggles %s', (testID, key) => {
    const onChange = setup();
    fireEvent.press(screen.getByTestId(testID));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ [key]: true }));
  });
});

describe('ProductFilterSheet · custom attribute groups (multi-select, web toggleCustomAttribute)', () => {
  const RARITY = {
    slug: 'rarity',
    name: 'Nadirlik',
    manufacturerSlug: null,
    attributes: [
      { slug: 'common', label: 'Yaygın', color: null },
      { slug: 'rare', label: 'Nadir', color: null },
    ],
  };
  const setup = (customAttributes: Record<string, string[]>) => {
    const onChange = jest.fn();
    render(
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        filters={{ ...EMPTY_FILTERS, customAttributes }}
        onChange={onChange}
        onClear={jest.fn()}
        options={options({ customAttributes: [RARITY] })}
        resultCount={0}
      />,
    );
    return onChange;
  };
  const checkedRows = () =>
    within(screen.getByTestId('filter-attr-rarity'))
      .getAllByRole('checkbox')
      .map((r) => r.props.accessibilityState.checked);

  it('shows every value a URL or saved search carries as checked', () => {
    setup({ rarity: ['common', 'rare'] });
    expect(checkedRows()).toEqual([true, true]);
  });

  it('a tap adds a value next to the picked one instead of replacing it', () => {
    const onChange = setup({ rarity: ['common'] });
    fireEvent.press(screen.getByText('Nadir'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ customAttributes: { rarity: ['common', 'rare'] } }),
    );
  });

  it('unchecking one value keeps the others; the last one drops the group', () => {
    const onChange = setup({ rarity: ['common', 'rare'] });
    fireEvent.press(screen.getByText('Nadir'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ customAttributes: { rarity: ['common'] } }),
    );
  });

  it('removing the only value drops the group key', () => {
    const onChange = setup({ rarity: ['rare'] });
    fireEvent.press(screen.getByText('Nadir'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ customAttributes: {} }));
  });
});

describe('ProductFilterSheet · price range (web SidebarFilters parity)', () => {
  const REFUSED = /Tutar kabul edilmedi/;
  const changes: ProductFilters[] = [];

  /** The sheet over real state, as on the search screen (each change re-renders the fields). */
  function Sheet({ initial }: { initial: Partial<ProductFilters> }) {
    const [filters, setFilters] = useState<ProductFilters>({ ...EMPTY_FILTERS, ...initial });
    return (
      <ProductFilterSheet
        visible
        onClose={jest.fn()}
        filters={filters}
        onChange={(next) => {
          changes.push(next);
          setFilters(next);
        }}
        onClear={() => setFilters(EMPTY_FILTERS)}
        options={options()}
        resultCount={0}
      />
    );
  }
  const setup = (initial: Partial<ProductFilters> = {}) => {
    changes.length = 0;
    render(<Sheet initial={initial} />);
  };
  const sent = () => buildListParams(changes.at(-1)!, 1, 24);
  const min = () => screen.getByTestId('filter-min-price');
  const max = () => screen.getByTestId('filter-max-price');
  const preset = (label: string) => screen.getByRole('button', { name: label });

  it('the fields use the decimal keyboard and keep the typed text', () => {
    setup();
    expect(min().props.keyboardType).toBe('decimal-pad');
    expect(max().props.keyboardType).toBe('decimal-pad');
    fireEvent.changeText(min(), '1250,50');
    expect(min().props.value).toBe('1250,50');
    expect(sent().minPrice).toBe(1250.5);
    expect(screen.queryByText(REFUSED)).toBeNull();
  });

  it('refuses "1.000": shows the refusal and searches no min (not 1 TL)', () => {
    setup({ minPrice: '500' });
    fireEvent.changeText(min(), '1.000');
    expect(screen.getByText(REFUSED)).toBeTruthy();
    expect(min().props.value).toBe('1.000');
    expect(sent()).not.toHaveProperty('minPrice');
  });

  it('shows a legacy grouped URL value as refused', () => {
    setup({ minPrice: '1.000', maxPrice: '5000' });
    expect(screen.getByText(REFUSED)).toBeTruthy();
  });

  it('zero is no bound and no error; a min above the max is kept (no swap)', () => {
    setup();
    fireEvent.changeText(max(), '0');
    expect(screen.queryByText(REFUSED)).toBeNull();
    expect(sent()).not.toHaveProperty('maxPrice');
    fireEvent.changeText(min(), '500');
    fireEvent.changeText(max(), '100');
    expect(sent()).toMatchObject({ minPrice: 500, maxPrice: 100 });
    expect(screen.queryByText(REFUSED)).toBeNull();
  });

  it('a quick range sets both bounds and is selected, also for typed text', () => {
    setup();
    expect(preset('1.000+ TL').props.accessibilityState).toMatchObject({ selected: false });
    fireEvent.press(preset('1.000+ TL'));
    expect(changes.at(-1)).toMatchObject({ minPrice: '1000', maxPrice: '' });
    expect(preset('1.000+ TL').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.changeText(min(), '100,00');
    fireEvent.changeText(max(), '500');
    expect(preset('100 - 500 TL').props.accessibilityState).toMatchObject({ selected: true });
  });
});
