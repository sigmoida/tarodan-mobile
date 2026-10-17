/**
 * Ana sayfa bölümleri (web bölüm kümesi): her bölüm SectionCard + "Tümünü gör ›"; yükleniyor = iskelet,
 * boş = çizilmez (Popüler hariç: web gibi ilan daveti), dolu = tek ProductCard rayı.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders as render } from '@/test-utils';
import { router } from 'expo-router';
import { FeaturedRail, OnSaleRail, PopularRail, TradeRail } from '../HomeRails';
import { BrandsStrip } from '../HomeBrands';
import { TopCollections } from '../HomeCollections';
import { Spotlights } from '../HomeSpotlights';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const noop = () => undefined;
const items = [
  { id: '1', title: 'Ürün 1', price: 100, images: [] },
  { id: '2', title: 'Ürün 2', price: 80, oldPrice: 100, images: [] },
];

describe('ürün rayları', () => {
  it('yükleniyor: iskelet çizer, ürün yok', () => {
    render(<FeaturedRail items={[]} isLoading onProductPress={noop} />);
    expect(screen.getByTestId('home-featured-skeleton')).toBeTruthy();
    expect(screen.getByText('Öne Çıkan Ürünler')).toBeTruthy();
  });

  it('boş: Öne Çıkan / İndirimdekiler / Takas Vitrini hiç yer kaplamaz', () => {
    render(
      <>
        <FeaturedRail items={[]} isLoading={false} onProductPress={noop} />
        <OnSaleRail items={[]} isLoading={false} onProductPress={noop} />
        <TradeRail items={[]} isLoading={false} onProductPress={noop} />
      </>,
    );
    expect(screen.queryByTestId('home-featured')).toBeNull();
    expect(screen.queryByTestId('home-on-sale')).toBeNull();
    expect(screen.queryByTestId('home-trade')).toBeNull();
  });

  it('boş Popüler: web gibi "Henüz ilan yok" + ilan daveti, geliştirici metni yok', () => {
    render(<PopularRail items={[]} isLoading={false} onProductPress={noop} />);
    expect(screen.getByText('Henüz ilan yok')).toBeTruthy();
    expect(screen.getByText('İlk ilanı siz verin!')).toBeTruthy();
    expect(screen.queryByText(/API/)).toBeNull();
    fireEvent.press(screen.getByText('İlan Oluştur'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/sell');
  });

  it('dolu: kartlar çizilir; karta basınca ekranın onProductPress\'i çalışır', () => {
    const onPress = jest.fn();
    render(<FeaturedRail items={items} isLoading={false} onProductPress={onPress} />);
    expect(screen.getByText('Ürün 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Ürün 2'));
    expect(onPress).toHaveBeenCalledWith('2');
  });

  it('kart web HomeProductCard gibi meta satırsız (görüntülenme/beğeni yok)', () => {
    render(<FeaturedRail items={[{ ...items[0]!, viewCount: 42, likeCount: 7 } as never]} isLoading={false} onProductPress={noop} />);
    expect(screen.queryByText('42')).toBeNull();
  });

  it('"Tümünü gör" aramayı web ile aynı ön filtre/sıralamayla açar (ayrı liste rotası yok)', () => {
    render(
      <>
        <FeaturedRail items={items} isLoading={false} onProductPress={noop} />
        <OnSaleRail items={items} isLoading={false} onProductPress={noop} />
        <TradeRail items={items} isLoading={false} onProductPress={noop} />
        <PopularRail items={items} isLoading={false} onProductPress={noop} />
      </>,
    );
    const links = screen.getAllByLabelText('Tümünü gör');
    fireEvent.press(links[0]!);
    expect(router.push).toHaveBeenLastCalledWith('/search');
    fireEvent.press(links[1]!);
    expect(router.push).toHaveBeenLastCalledWith('/search?discountOnly=true');
    fireEvent.press(links[2]!);
    expect(router.push).toHaveBeenLastCalledWith('/search?tradeOnly=true');
    fireEvent.press(links[3]!);
    expect(router.push).toHaveBeenLastCalledWith('/search?sortBy=view_count_desc');
  });

  it('İndirimdekiler başlığında sabit "Fırsat" etiketi yok', () => {
    render(<OnSaleRail items={items} isLoading={false} onProductPress={noop} />);
    expect(screen.getByText('İndirimdekiler')).toBeTruthy();
    expect(screen.queryByText('Fırsat')).toBeNull();
  });
});

describe('üretici şeridi', () => {
  it('boş: çizilmez; dolu: logosuz üreticide ad, dokununca üreticiye göre arama', () => {
    const { rerender } = render(<BrandsStrip items={[]} />);
    expect(screen.queryByTestId('home-brands')).toBeNull();
    rerender(<BrandsStrip items={[{ id: 'm1', name: 'Hot Wheels' }]} />);
    fireEvent.press(screen.getByText('Hot Wheels'));
    // Web menüsüyle aynı: ad (çip etiketi) + id (API süzgeci) birlikte.
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/search',
      params: { manufacturer: 'Hot Wheels', manufacturerId: 'm1' },
    });
  });
});

describe('üretici şeridi — yükleniyor', () => {
  it('yüklenirken aynı yükseklikte iskelet kutular (null değil); veri gelince şerit', () => {
    const { rerender } = render(<BrandsStrip items={[]} isLoading />);
    expect(screen.getByTestId('home-brands-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('home-brands')).toBeNull();
    rerender(<BrandsStrip items={[{ id: 'm1', name: 'Hot Wheels' }]} isLoading={false} />);
    expect(screen.queryByTestId('home-brands-skeleton')).toBeNull();
    expect(screen.getByTestId('home-brands')).toBeTruthy();
  });
});

describe('koleksiyonlar ve öne çıkanlar', () => {
  const collection = {
    id: 'c1',
    name: 'Garajım',
    itemCount: 4,
    viewCount: 1590,
    likeCount: 12,
    user: { displayName: 'Ali', isVerified: true },
    items: [],
  };

  it('En İyi Koleksiyonlar: kart ad, koleksiyoner ve "1.590 görüntü" biçimi', () => {
    render(<TopCollections items={[collection]} />);
    expect(screen.getByText('En İyi Koleksiyonlar')).toBeTruthy();
    expect(screen.getByText('Garajım')).toBeTruthy();
    expect(screen.getByText('Ali')).toBeTruthy();
    expect(screen.getByText(/1\.590 görüntü/)).toBeTruthy();
  });

  it('boş koleksiyon listesi çizilmez', () => {
    render(<TopCollections items={[]} />);
    expect(screen.queryByTestId('home-top-collections')).toBeNull();
  });

  it('Haftanın Koleksiyoneri / Şirketi yüklenirken iskelet; yükleme bitip ikisi de yoksa hiçbir şey', () => {
    const { rerender } = render(<Spotlights collector={null} business={null} isLoading />);
    expect(screen.getByTestId('home-spotlights-skeleton')).toBeTruthy();
    rerender(<Spotlights collector={null} business={null} isLoading={false} />);
    expect(screen.queryByTestId('home-spotlights-skeleton')).toBeNull();
    expect(screen.queryByTestId('home-collector')).toBeNull();
  });

  it('Haftanın Koleksiyoneri ve Şirketi; ikisi de yoksa hiçbir şey', () => {
    const { rerender } = render(<Spotlights collector={null} business={null} />);
    expect(screen.queryByTestId('home-collector')).toBeNull();
    rerender(
      <Spotlights
        collector={collection}
        business={{ id: 'b1', displayName: 'Mağaza A', isVerified: true, stats: { totalProducts: 3, averageRating: 4.5, totalRatings: 2 }, products: [] }}
      />,
    );
    expect(screen.getByText('Haftanın Koleksiyoneri')).toBeTruthy();
    expect(screen.getByText('Haftanın Şirketi')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    fireEvent.press(screen.getByText('Mağazayı İncele'));
    expect(router.push).toHaveBeenCalledWith('/seller/b1');
  });
});
