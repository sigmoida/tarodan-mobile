/**
 * Task 2 (B1 kalanı): CategoriesSection / FeaturedCollectorSection / BoostedRail /
 * ProductsGrid / CollectionsSection artık AdBanner ile aynı deseni izliyor:
 * query yüklenirken kendi rezerve yüksekliğinde boş yer tutuyor, yükleme
 * bitip veri boş çıkınca hiç yer kaplamıyor (`null`), veri varsa normal
 * içeriği çiziyor. Üç durumu da (loading / empty / content) her bölüm için
 * doğruluyoruz.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';
import {
  CategoriesSection,
  FeaturedCollectorSection,
  BoostedRail,
  ProductsGrid,
  CollectionsSection,
} from '../HomeSections';
import { CompanyOfWeekSection } from '../CompanyOfWeekSection';
import {
  styles,
  SECTION_HEADER_HEIGHT,
  SECTION_MARGIN_BOTTOM,
  POPULAR_RAIL_MIN_HEIGHT,
  CATEGORIES_SECTION_MIN_HEIGHT,
  FEATURED_COLLECTOR_SECTION_MIN_HEIGHT,
  BOOSTED_RAIL_MIN_HEIGHT,
  PRODUCTS_GRID_MIN_HEIGHT,
  COLLECTIONS_SECTION_MIN_HEIGHT,
  COMPANY_OF_WEEK_SECTION_MIN_HEIGHT,
} from '../../_lib/styles';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

const noop = () => undefined;
const emptySet = new Set<string>();
const cardProps = { cartProductIds: emptySet, onProductPress: noop };

describe('CategoriesSection', () => {
  it('loading: rezerve alan çizer', () => {
    render(<CategoriesSection categories={[]} isLoading />);
    const el = screen.getByTestId('categories-section-reserved');
    expect(el.props.style).toEqual(styles.categoriesSectionReserved);
    expect(styles.categoriesSectionReserved.minHeight).toBe(CATEGORIES_SECTION_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<CategoriesSection categories={[]} isLoading={false} />);
    expect(screen.queryByTestId('categories-section-reserved')).toBeNull();
    expect(screen.queryByText('Kategoriler')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    render(<CategoriesSection categories={[{ id: '1', name: 'Klasikler', productCount: 3 }]} isLoading={false} />);
    expect(screen.getByText('Kategoriler')).toBeTruthy();
    expect(screen.getByText('Klasikler')).toBeTruthy();
  });
});

describe('FeaturedCollectorSection', () => {
  it('loading: rezerve alan çizer', () => {
    render(<FeaturedCollectorSection featuredCollector={null} isLoading />);
    const el = screen.getByTestId('featured-collector-section-reserved');
    expect(el.props.style).toEqual(styles.featuredCollectorSectionReserved);
    expect(styles.featuredCollectorSectionReserved.minHeight).toBe(FEATURED_COLLECTOR_SECTION_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<FeaturedCollectorSection featuredCollector={null} isLoading={false} />);
    expect(screen.queryByTestId('featured-collector-section-reserved')).toBeNull();
    expect(screen.queryByText('Haftanın Koleksiyoneri')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    render(
      <FeaturedCollectorSection
        featuredCollector={{ id: '1', userName: 'Ali', itemCount: 5, likeCount: 2 }}
        isLoading={false}
      />
    );
    expect(screen.getByText('Haftanın Koleksiyoneri')).toBeTruthy();
  });
});

describe('BoostedRail', () => {
  it('loading: rezerve alan çizer', () => {
    render(<BoostedRail items={[]} isLoading {...cardProps} />);
    const el = screen.getByTestId('boosted-rail-reserved');
    expect(el.props.style).toEqual(styles.boostedRailReserved);
    expect(styles.boostedRailReserved.minHeight).toBe(BOOSTED_RAIL_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<BoostedRail items={[]} isLoading={false} {...cardProps} />);
    expect(screen.queryByTestId('boosted-rail-reserved')).toBeNull();
    expect(screen.queryByText('Sponsorlu Ürünler')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    const items = [{ id: '1', title: 'Ürün 1', price: 100, images: [] }];
    render(<BoostedRail items={items} isLoading={false} {...cardProps} />);
    expect(screen.getByText('Sponsorlu Ürünler')).toBeTruthy();
  });
});

describe('ProductsGrid', () => {
  it('loading: rezerve alan çizer', () => {
    render(<ProductsGrid items={[]} isLoading {...cardProps} />);
    const el = screen.getByTestId('products-grid-reserved');
    expect(el.props.style).toEqual(styles.productsGridReserved);
    expect(styles.productsGridReserved.minHeight).toBe(PRODUCTS_GRID_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<ProductsGrid items={[]} isLoading={false} {...cardProps} />);
    expect(screen.queryByTestId('products-grid-reserved')).toBeNull();
    expect(screen.queryByText('Tüm İlanlar')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    const items = [{ id: '1', title: 'Ürün 1', price: 100, images: [] }];
    render(<ProductsGrid items={items} isLoading={false} {...cardProps} />);
    expect(screen.getByText('Tüm İlanlar')).toBeTruthy();
  });
});

describe('CompanyOfWeekSection', () => {
  it('loading: rezerve alan çizer', () => {
    render(<CompanyOfWeekSection companyOfWeek={null} isLoading />);
    const el = screen.getByTestId('company-of-week-section-reserved');
    expect(el.props.style).toEqual(styles.companyOfWeekSectionReserved);
    expect(styles.companyOfWeekSectionReserved.minHeight).toBe(COMPANY_OF_WEEK_SECTION_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<CompanyOfWeekSection companyOfWeek={null} isLoading={false} />);
    expect(screen.queryByTestId('company-of-week-section-reserved')).toBeNull();
    expect(screen.queryByText('Haftanın Şirketi')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    render(<CompanyOfWeekSection companyOfWeek={{ id: '1', companyName: 'Acme' }} isLoading={false} />);
    expect(screen.getByText('Haftanın Şirketi')).toBeTruthy();
  });
});

describe('CollectionsSection', () => {
  it('loading: rezerve alan çizer', () => {
    render(<CollectionsSection collections={[]} isLoading />);
    const el = screen.getByTestId('collections-section-reserved');
    expect(el.props.style).toEqual(styles.collectionsSectionReserved);
    expect(styles.collectionsSectionReserved.minHeight).toBe(COLLECTIONS_SECTION_MIN_HEIGHT);
  });

  it('boş: hiç yer kaplamaz', () => {
    render(<CollectionsSection collections={[]} isLoading={false} />);
    expect(screen.queryByTestId('collections-section-reserved')).toBeNull();
    expect(screen.queryByText('Koleksiyonlar')).toBeNull();
  });

  it('dolu: içeriği çizer', () => {
    render(
      <CollectionsSection
        collections={[{ id: '1', name: 'Klasik Koleksiyon', itemCount: 4, coverImageUrl: '' }]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Koleksiyonlar')).toBeTruthy();
  });
});

/**
 * Değer doğruluğu (inceleme notu): önceki `toBe(X_MIN_HEIGHT)` testleri
 * sadece stilin sabite BAĞLANDIĞINI kontrol ediyordu, sabitin kendisinin
 * gerçek render yüksekliğine yakın olduğunu değil — `section.marginBottom`
 * (28pt) beş bölümün de rezervinden eksikti ve hiçbir test bunu yakalamadı.
 * Burada her MIN_HEIGHT'i, `_lib/styles.ts`'teki private sabitleri değil,
 * doğrudan `theme`den bağımsızca yeniden hesaplayıp karşılaştırıyoruz —
 * ikisi ayrışırsa (ör. biri güncellenip diğeri unutulursa) bu test kırılır.
 */
describe('rezerve yüksekliklerinin değer doğruluğu (regresyon)', () => {
  const { typography } = theme;

  it('SECTION_MARGIN_BOTTOM her `section` sarmalayıcısının gerçek marginBottom değeriyle eşleşir', () => {
    expect(styles.section.marginBottom).toBe(SECTION_MARGIN_BOTTOM);
    expect(SECTION_MARGIN_BOTTOM).toBe(28);
  });

  it('SECTION_HEADER_HEIGHT bağımsızca hesaplanan indicator/title + marginBottom toplamına eşittir', () => {
    const indicatorHeight = 24;
    const titleHeight = typography.fontSize.xl * typography.lineHeight.snug;
    expect(SECTION_HEADER_HEIGHT).toBe(Math.max(indicatorHeight, titleHeight) + theme.spacing[4]);
  });

  it('her *_MIN_HEIGHT en az SECTION_HEADER_HEIGHT + SECTION_MARGIN_BOTTOM kadardır (28pt-sınıfı eksik-rezerv regresyonu)', () => {
    const floor = SECTION_HEADER_HEIGHT + SECTION_MARGIN_BOTTOM;
    expect(CATEGORIES_SECTION_MIN_HEIGHT).toBeGreaterThanOrEqual(floor);
    expect(FEATURED_COLLECTOR_SECTION_MIN_HEIGHT).toBeGreaterThanOrEqual(floor);
    expect(BOOSTED_RAIL_MIN_HEIGHT).toBeGreaterThanOrEqual(floor);
    expect(PRODUCTS_GRID_MIN_HEIGHT).toBeGreaterThanOrEqual(floor);
    expect(COLLECTIONS_SECTION_MIN_HEIGHT).toBeGreaterThanOrEqual(floor);
    // CompanyOfWeekSection kendi `styles.section`ini kullanmıyor (bkz.
    // companySection.marginBottom = spacing[6]), o yüzden bu tabana dahil
    // değil — kendi tabanını ayrı doğruluyoruz.
    expect(COMPANY_OF_WEEK_SECTION_MIN_HEIGHT).toBeGreaterThanOrEqual(SECTION_HEADER_HEIGHT + theme.spacing[6]);
  });

  it('BOOSTED_RAIL_MIN_HEIGHT / PRODUCTS_GRID_MIN_HEIGHT = header + POPULAR_RAIL_MIN_HEIGHT + section margin', () => {
    const expected = SECTION_HEADER_HEIGHT + POPULAR_RAIL_MIN_HEIGHT + SECTION_MARGIN_BOTTOM;
    expect(BOOSTED_RAIL_MIN_HEIGHT).toBe(expected);
    expect(PRODUCTS_GRID_MIN_HEIGHT).toBe(expected);
  });

  it('CollectionsSection: bağımsızca hesaplanan kart metrikleri (image 110 + padding + isim + meta satırı)', () => {
    const imageHeight = 110; // collectionImage.height
    const infoPadding = theme.spacing[3] * 2;
    const nameHeight = typography.fontSize.sm * typography.lineHeight.normal;
    const metaHeight = theme.spacing[1] + typography.fontSize.xs * typography.lineHeight.normal;
    const expected = SECTION_HEADER_HEIGHT + imageHeight + infoPadding + nameHeight + metaHeight + SECTION_MARGIN_BOTTOM;
    expect(COLLECTIONS_SECTION_MIN_HEIGHT).toBe(expected);
  });
});
