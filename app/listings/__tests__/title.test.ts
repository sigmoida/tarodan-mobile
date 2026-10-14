import type { TFunction } from 'i18next';
import { EMPTY_FILTERS, type ProductFilters } from '@/utils/productFilters';
import { listingsTitle } from '../_lib/title';

const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;
const f = (patch: Partial<ProductFilters>): ProductFilters => ({ ...EMPTY_FILTERS, ...patch });

describe('listingsTitle', () => {
  it('filtre yoksa "Tüm İlanlar"', () => {
    expect(listingsTitle(EMPTY_FILTERS, t)).toBe('seller.allListings');
  });

  it('arama her şeyin önünde', () => {
    expect(listingsTitle(f({ search: ' ferrari ', tradeOnly: true, brand: 'Mattel' }), t)).toBe(
      'product.searchResultsFor:{"query":"ferrari"}',
    );
  });

  it('ön ayarlar: takas → indirim → popüler', () => {
    expect(listingsTitle(f({ tradeOnly: true, discountOnly: true }), t)).toBe('nav.tradeShowcase');
    expect(listingsTitle(f({ discountOnly: true, sortBy: 'view_count_desc' }), t)).toBe('product.onSale');
    expect(listingsTitle(f({ sortBy: 'view_count_desc', brand: 'Mattel' }), t)).toBe(
      'home.popularListings',
    );
  });

  it('başka sıralama ön ayar sayılmaz', () => {
    expect(listingsTitle(f({ sortBy: 'price_asc' }), t)).toBe('seller.allListings');
  });

  it('marka / kategori / üretici adı', () => {
    expect(listingsTitle(f({ brand: 'Mattel', category: 'Arabalar' }), t)).toBe('Mattel');
    expect(listingsTitle(f({ category: 'Arabalar', manufacturer: 'Hot Wheels' }), t)).toBe('Arabalar');
    expect(listingsTitle(f({ manufacturer: 'Hot Wheels' }), t)).toBe('Hot Wheels');
  });

  it('yalnız kimlik geldiyse adı seçeneklerden bulur, bulamazsa varsayılan', () => {
    const options = { categories: [{ id: 'c1', name: 'Kamyonlar', slug: 'kamyonlar' }] };
    expect(listingsTitle(f({ categoryId: 'c1' }), t, options)).toBe('Kamyonlar');
    expect(listingsTitle(f({ categoryId: 'yok' }), t, options)).toBe('seller.allListings');
  });

  it('canlı filtre değişince başlık da değişir (ön ayar kalkınca)', () => {
    const preset = f({ discountOnly: true });
    expect(listingsTitle(preset, t)).toBe('product.onSale');
    expect(listingsTitle({ ...preset, discountOnly: false }, t)).toBe('seller.allListings');
  });
});
