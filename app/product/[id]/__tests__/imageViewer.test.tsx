/**
 * Görsel görüntüleyici: açılış indeksi, küçük resme dokununca geçiş, büyük fotoğraf kaydırılınca
 * küçük resim senkronu, tek fotoğrafta şerit/sayaç yok.
 */
import React from 'react';
import { Dimensions } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ImageViewerModal } from '../_modals/ImageViewerModal';

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('@/components/product/ZoomableImage', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ uri }: { uri: string }) => <View testID={`zoom-${uri}`} /> };
});

const images = [{ url: 'https://x/a.jpg' }, { url: 'https://x/b.jpg' }, 'https://x/c.jpg'];

const open = (over: Record<string, unknown> = {}) => {
  const onClose = jest.fn();
  render(<ImageViewerModal visible images={images} initialIndex={0} onClose={onClose} {...over} />);
  return onClose;
};

const selected = (i: number) =>
  screen.getByTestId(`image-viewer-thumb-${i}`).props.accessibilityState?.selected === true;

describe('ImageViewerModal', () => {
  it('dokunulan indeksle açılır: sayaç ve seçili küçük resim', () => {
    open({ initialIndex: 1 });
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('2 / 3');
    expect(selected(1)).toBe(true);
    expect(selected(2)).toBe(false);
  });

  it('küçük resme dokununca indeks değişir', () => {
    open();
    fireEvent.press(screen.getByTestId('image-viewer-thumb-2'));
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('3 / 3');
    expect(selected(2)).toBe(true);
    expect(selected(0)).toBe(false);
  });

  it('büyük fotoğraf kaydırılınca seçili küçük resim senkron döner', () => {
    open();
    const { width } = Dimensions.get('window');
    // Sayfalayıcı sanal liste (FlatList): olay ölçüleri de taşır.
    fireEvent.scroll(screen.getByTestId('image-viewer-pager'), {
      nativeEvent: {
        contentOffset: { x: width, y: 0 },
        layoutMeasurement: { width, height: 600 },
        contentSize: { width: width * images.length, height: 600 },
      },
    });
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('2 / 3');
    expect(selected(1)).toBe(true);
  });

  it('X kapatır', () => {
    const onClose = open();
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tek fotoğrafta küçük resim şeridi ve sayaç yok', () => {
    open({ images: [images[0]] });
    expect(screen.queryByTestId('image-viewer-thumbs')).toBeNull();
    expect(screen.queryByTestId('image-viewer-counter')).toBeNull();
  });

  it('sayfalar sanal: çok fotoğrafta hepsi birden bağlanmaz, açılan sayfa bağlı', () => {
    const many = Array.from({ length: 12 }, (_, i) => `https://x/${i}.jpg`);
    open({ images: many, initialIndex: 6 });
    expect(screen.getByTestId('zoom-https://x/6.jpg')).toBeTruthy();
    expect(screen.queryAllByTestId(/^zoom-/).length).toBeLessThan(many.length);
    expect(screen.queryByTestId('zoom-https://x/0.jpg')).toBeNull();
  });

  it('kapalıyken içerik bağlanmaz', () => {
    open({ visible: false });
    expect(screen.queryByTestId('image-viewer-pager')).toBeNull();
  });
});
