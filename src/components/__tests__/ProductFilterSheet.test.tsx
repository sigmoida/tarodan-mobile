/**
 * Filtre sayfası — üretici değişince yalnız üreticiye bağlı özel grup
 * seçimleri sıfırlanır; genel gruplar (Nadirlik vb., `manufacturerSlug: null`)
 * kalır (delta 19, C-3.6). Genel grup üreticisiz de listelenir.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
  carModels: [],
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
