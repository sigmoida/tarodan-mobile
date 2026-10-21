/**
 * Shared thumbnail strip: card-size URLs (detail fallback), selected state, accessibility,
 * clamped centring of the selected thumbnail and the single-image guard.
 */
import React from 'react';
import { Dimensions, FlatList } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { renderWithProviders } from '@/test-utils';
import { ImageThumbStrip, centredThumbOffset } from '../_components/ImageThumbStrip';

const images = [
  { url: 'https://x/a-detail.jpg', detailUrl: 'https://x/a-detail.jpg', cardUrl: 'https://x/a-card.jpg' },
  { url: 'https://x/b-detail.jpg', detailUrl: 'https://x/b-detail.jpg', cardUrl: 'https://x/b-card.jpg' },
  'https://x/c.jpg',
];

const setup = (over: Record<string, unknown> = {}) => {
  const onSelect = jest.fn();
  const utils = renderWithProviders(
    <ImageThumbStrip images={images} selectedIndex={0} onSelect={onSelect} testID="strip" {...over} />,
  );
  return { onSelect, ...utils };
};

describe('ImageThumbStrip', () => {
  it('renders one thumbnail per image with ids derived from the testID prefix', () => {
    setup();
    expect(screen.getByTestId('strip-thumbs')).toBeTruthy();
    for (const i of [0, 1, 2]) expect(screen.getByTestId(`strip-thumb-${i}`)).toBeTruthy();
  });

  it('loads the card-size URL, never the detail one', () => {
    setup();
    const uris = screen.UNSAFE_getAllByType(Image).map((img) => img.props.source.uri);
    expect(uris).toEqual(['https://x/a-card.jpg', 'https://x/b-card.jpg', 'https://x/c.jpg']);
  });

  it('marks only the selected thumbnail', () => {
    setup();
    expect(screen.getByTestId('strip-thumb-0').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('strip-thumb-1').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('strip-thumb-2').props.accessibilityState.selected).toBe(false);
  });

  it('announces "Photo n of total" and the image button role', () => {
    setup();
    const thumb = screen.getByTestId('strip-thumb-2');
    expect(thumb.props.accessibilityRole).toBe('imagebutton');
    expect(thumb.props.accessibilityLabel).toBe('3 fotoğraftan 3.');
  });

  it('reports the tapped index', () => {
    const { onSelect } = setup();
    fireEvent.press(screen.getByTestId('strip-thumb-2'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('opens centred and follows the selection, in place first and animated afterwards', () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
    try {
      const { rerender, onSelect } = setup({ selectedIndex: 1 });
      const list = screen.getByTestId('strip-thumbs');
      const { width } = Dimensions.get('window');
      // The first frame is placed from the window width; no scroll before the list is measured.
      expect(list.props.contentOffset).toEqual({ x: centredThumbOffset(1, 3, width), y: 0 });
      expect(scrollToOffset).not.toHaveBeenCalled();
      fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 60 } } });
      expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: centredThumbOffset(1, 3, 200), animated: false });
      rerender(<ImageThumbStrip images={images} selectedIndex={2} onSelect={onSelect} testID="strip" />);
      expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: centredThumbOffset(2, 3, 200), animated: true });
    } finally {
      scrollToOffset.mockRestore();
    }
  });

  describe('centredThumbOffset', () => {
    // 15 thumbnails: 16 + 15 * 60 + 14 * 8 + 16 = 1044 pt of content.
    it('puts a middle thumbnail in the centre of the strip', () => {
      // Thumbnail 7 spans 16 + 7 * 68 = 492 .. 552, centre 522; half of a 390 pt strip is 195.
      expect(centredThumbOffset(7, 15, 390)).toBe(327);
    });

    it('never scrolls before the start or past the end of the content', () => {
      expect(centredThumbOffset(0, 15, 390)).toBe(0);
      expect(centredThumbOffset(14, 15, 390)).toBe(1044 - 390);
    });

    it('does not scroll when every thumbnail fits', () => {
      expect(centredThumbOffset(2, 3, 390)).toBe(0);
    });
  });

  it('falls back to the detail URL when an image has no card variant', () => {
    setup({ images: [{ url: 'https://x/a-detail.jpg', detailUrl: 'https://x/a-detail.jpg' }, images[1]] });
    const uris = screen.UNSAFE_getAllByType(Image).map((img) => img.props.source.uri);
    expect(uris).toEqual(['https://x/a-detail.jpg', 'https://x/b-card.jpg']);
  });

  it('renders nothing for fewer than two images', () => {
    setup({ images: [images[0]] });
    expect(screen.queryByTestId('strip-thumbs')).toBeNull();
    expect(screen.queryByTestId('strip-thumb-0')).toBeNull();
  });
});
