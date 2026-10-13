/**
 * Ürün galerisi: sanal yatay sayfalama, cam hap içinde "2 / 3" göstergesi (opacity animasyonu yok),
 * ekran okuyucu etiketi ve görseller için detay boyutlu AppImage.
 */
import React from 'react';
import { Dimensions, FlatList } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { renderWithProviders } from '@/test-utils';
import { ProductGallery } from '../_components/ProductGallery';

const images = [
  { url: 'https://x/a.jpg', detailUrl: 'https://x/a-detail.jpg', cardUrl: 'https://x/a-card.jpg' },
  { url: 'https://x/b.jpg' },
  'https://x/c.jpg',
];

const setup = (over: Record<string, unknown> = {}) => {
  const onPageChange = jest.fn();
  const onOpenViewer = jest.fn();
  renderWithProviders(
    <ProductGallery images={images} currentImage={1} onPageChange={onPageChange} onOpenViewer={onOpenViewer} {...over} />,
  );
  return { onPageChange, onOpenViewer };
};

describe('ProductGallery', () => {
  it('birden fazla görselde "2 / 3" göstergesi ve erişilebilirlik etiketi', () => {
    setup();
    expect(screen.getByTestId('product-gallery-dots')).toBeTruthy();
    expect(screen.getByTestId('product-gallery-counter')).toHaveTextContent('2 / 3');
    expect(screen.getByLabelText('3 fotoğraftan 2.')).toBeTruthy();
  });

  it('tek görselde gösterge yok', () => {
    setup({ images: [images[0]], currentImage: 0 });
    expect(screen.queryByTestId('product-gallery-dots')).toBeNull();
  });

  it('ilk sayfa detay boyutlu varyantla yüklenir (cardUrl/orijinal değil)', () => {
    setup({ currentImage: 0 });
    const first = screen.UNSAFE_getAllByType(Image)[0]!;
    expect(first.props.source).toEqual({ uri: 'https://x/a-detail.jpg' });
  });

  it('kaydırınca sayfa değişimi bildirilir; dokununca görüntüleyici açılır', () => {
    const { onPageChange, onOpenViewer } = setup({ currentImage: 0 });
    const { width } = Dimensions.get('window');
    fireEvent.scroll(screen.UNSAFE_getByType(FlatList), {
      nativeEvent: { contentOffset: { x: width * 2, y: 0 } },
    });
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.press(screen.getAllByLabelText('Fotoğrafı büyüt')[0]!);
    expect(onOpenViewer).toHaveBeenCalledWith(0);
  });
});
