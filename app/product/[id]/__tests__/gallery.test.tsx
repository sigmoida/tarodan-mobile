/**
 * Product gallery: virtual horizontal paging, the "2 / 3" counter in a glass pill (no opacity
 * animation), the screen-reader label, detail-size AppImage pages and the card-size thumbnail strip.
 */
import React from 'react';
import { Dimensions, FlatList } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { renderWithProviders } from '@/test-utils';
import { ProductGallery } from '../_components/ProductGallery';

const images = [
  { url: 'https://x/a.jpg', detailUrl: 'https://x/a-detail.jpg', cardUrl: 'https://x/a-card.jpg' },
  { url: 'https://x/b.jpg' },
  'https://x/c.jpg',
];

const imageSources = () => screen.UNSAFE_getAllByType(Image).map((img) => img.props.source.uri);

const setup = (over: Record<string, unknown> = {}) => {
  const onPageChange = jest.fn();
  const onOpenViewer = jest.fn();
  renderWithProviders(
    <ProductGallery images={images} currentImage={1} onPageChange={onPageChange} onOpenViewer={onOpenViewer} {...over} />,
  );
  return { onPageChange, onOpenViewer };
};

describe('ProductGallery', () => {
  it('shows the "2 / 3" counter with its accessibility label for several images', () => {
    setup();
    expect(screen.getByTestId('product-gallery-dots')).toBeTruthy();
    expect(screen.getByTestId('product-gallery-counter')).toHaveTextContent('2 / 3');
    expect(within(screen.getByTestId('product-gallery-dots')).getByLabelText('3 fotoğraftan 2.')).toBeTruthy();
  });

  it('shows no counter for a single image', () => {
    setup({ images: [images[0]], currentImage: 0 });
    expect(screen.queryByTestId('product-gallery-dots')).toBeNull();
  });

  it('loads the first page with the detail variant (not cardUrl or the original)', () => {
    setup({ currentImage: 0 });
    const first = screen.UNSAFE_getAllByType(Image)[0]!;
    expect(first.props.source).toEqual({ uri: 'https://x/a-detail.jpg' });
  });

  it('prefetches the detail images of the neighbouring pages once per neighbour set', () => {
    const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
    try {
      const { rerender } = renderWithProviders(
        <ProductGallery images={images} currentImage={1} onPageChange={jest.fn()} onOpenViewer={jest.fn()} />,
      );
      expect(prefetch).toHaveBeenCalledTimes(1);
      expect(prefetch).toHaveBeenCalledWith(['https://x/c.jpg', 'https://x/a-detail.jpg'], 'memory-disk');
      // The same neighbours under a new array identity: no new request.
      rerender(<ProductGallery images={[...images]} currentImage={1} onPageChange={jest.fn()} onOpenViewer={jest.fn()} />);
      expect(prefetch).toHaveBeenCalledTimes(1);
      rerender(<ProductGallery images={images} currentImage={0} onPageChange={jest.fn()} onOpenViewer={jest.fn()} />);
      expect(prefetch).toHaveBeenLastCalledWith(['https://x/b.jpg'], 'memory-disk');
    } finally {
      prefetch.mockRestore();
    }
  });

  it('reports page changes on scroll and opens the viewer on tap', () => {
    const { onPageChange, onOpenViewer } = setup({ currentImage: 0 });
    const { width } = Dimensions.get('window');
    fireEvent.scroll(screen.UNSAFE_getAllByType(FlatList)[0]!, {
      nativeEvent: { contentOffset: { x: width * 2, y: 0 } },
    });
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.press(screen.getAllByLabelText('Fotoğrafı büyüt')[0]!);
    expect(onOpenViewer).toHaveBeenCalledWith(0);
  });

  describe('thumbnail strip', () => {
    it('shows a thumbnail per image under the main image, the current one selected', () => {
      setup({ currentImage: 0 });
      expect(screen.getByTestId('product-gallery-thumbs')).toBeTruthy();
      for (const i of [0, 1, 2]) expect(screen.getByTestId(`product-gallery-thumb-${i}`)).toBeTruthy();
      expect(screen.getByTestId('product-gallery-thumb-0').props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('product-gallery-thumb-1').props.accessibilityState.selected).toBe(false);
    });

    it('shows no strip for a single image or the placeholder', () => {
      setup({ images: [images[0]], currentImage: 0 });
      expect(screen.queryByTestId('product-gallery-thumbs')).toBeNull();
    });

    it('requests the card-size URL for thumbnails and the detail URL for pages', () => {
      setup({ currentImage: 0 });
      const uris = imageSources();
      expect(uris).toContain('https://x/a-card.jpg');
      expect(uris).toContain('https://x/a-detail.jpg');
      // The first image has both variants: the detail one is the page, the card one the thumbnail.
      expect(uris.filter((u) => u === 'https://x/a-detail.jpg')).toHaveLength(1);
    });

    it('a thumbnail tap pages the main image and reports the page, without opening the viewer', () => {
      const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset');
      try {
        const { onPageChange, onOpenViewer } = setup({ currentImage: 0 });
        fireEvent.press(screen.getByTestId('product-gallery-thumb-2'));
        const { width } = Dimensions.get('window');
        expect(onPageChange).toHaveBeenCalledWith(2);
        expect(scrollToOffset).toHaveBeenCalledWith({ offset: width * 2, animated: true });
        expect(onOpenViewer).not.toHaveBeenCalled();
      } finally {
        scrollToOffset.mockRestore();
      }
    });

    it('ignores the pages passed while a thumbnail tap animates the pager', () => {
      const { onPageChange } = setup({ currentImage: 0 });
      const { width } = Dimensions.get('window');
      const pager = screen.UNSAFE_getAllByType(FlatList)[0]!;
      fireEvent.press(screen.getByTestId('product-gallery-thumb-2'));
      onPageChange.mockClear();
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).not.toHaveBeenCalled();
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width * 2, y: 0 } } });
      expect(onPageChange).toHaveBeenCalledWith(2);
      // Back to normal: later swipes report every page.
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).toHaveBeenLastCalledWith(1);
    });

    it('reports the page shown when an interrupted tap animation comes to rest', () => {
      const { onPageChange } = setup({ currentImage: 0 });
      const { width } = Dimensions.get('window');
      const pager = screen.UNSAFE_getAllByType(FlatList)[0]!;
      fireEvent.press(screen.getByTestId('product-gallery-thumb-2'));
      onPageChange.mockClear();
      // The animation stops on page 1: the in-between scroll is ignored, the rest position is not.
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).not.toHaveBeenCalled();
      fireEvent(pager, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).toHaveBeenLastCalledWith(1);
    });

    it('hands page reporting back to the user when they drag during a tap animation', () => {
      const { onPageChange } = setup({ currentImage: 0 });
      const { width } = Dimensions.get('window');
      const pager = screen.UNSAFE_getAllByType(FlatList)[0]!;
      fireEvent.press(screen.getByTestId('product-gallery-thumb-2'));
      onPageChange.mockClear();
      fireEvent(pager, 'scrollBeginDrag', { nativeEvent: { contentOffset: { x: width / 2, y: 0 } } });
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).toHaveBeenLastCalledWith(1);
    });

    it('keeps the tap target through a plain touch (Android does not stop the animation on it)', () => {
      const { onPageChange } = setup({ currentImage: 0 });
      const { width } = Dimensions.get('window');
      const pager = screen.UNSAFE_getAllByType(FlatList)[0]!;
      fireEvent.press(screen.getByTestId('product-gallery-thumb-2'));
      onPageChange.mockClear();
      fireEvent(pager, 'touchStart', { nativeEvent: {} });
      fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 } } });
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('re-tapping the selected thumbnail only realigns the pager', () => {
      const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset');
      try {
        const { onPageChange } = setup({ currentImage: 1 });
        const { width } = Dimensions.get('window');
        fireEvent.press(screen.getByTestId('product-gallery-thumb-1'));
        expect(onPageChange).toHaveBeenLastCalledWith(1);
        expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: width, animated: true });
        // No target was armed: a later swipe reports its page straight away.
        fireEvent.scroll(screen.UNSAFE_getAllByType(FlatList)[0]!, { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
        expect(onPageChange).toHaveBeenLastCalledWith(0);
      } finally {
        scrollToOffset.mockRestore();
      }
    });

    it('swiping the main image moves the selected thumbnail', () => {
      const { rerender } = renderWithProviders(
        <ProductGallery images={images} currentImage={0} onPageChange={jest.fn()} onOpenViewer={jest.fn()} />,
      );
      expect(screen.getByTestId('product-gallery-thumb-0').props.accessibilityState.selected).toBe(true);
      rerender(<ProductGallery images={images} currentImage={2} onPageChange={jest.fn()} onOpenViewer={jest.fn()} />);
      expect(screen.getByTestId('product-gallery-thumb-2').props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('product-gallery-thumb-0').props.accessibilityState.selected).toBe(false);
    });
  });
});
