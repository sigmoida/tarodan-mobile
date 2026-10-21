/**
 * Shared thumbnail strip: card-size URLs (detail fallback), selected state, accessibility,
 * layout-gated centring of the selected thumbnail and the single-image guard.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { renderWithProviders } from '@/test-utils';
import { ImageThumbStrip } from '../_components/ImageThumbStrip';

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

  it('centres the selected thumbnail only after the strip has its width, then follows the selection', () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    try {
      const { rerender, onSelect } = setup({ selectedIndex: 1 });
      // Before the first layout the list would centre against a zero-wide viewport.
      expect(scrollToIndex).not.toHaveBeenCalled();
      fireEvent(screen.getByTestId('strip-thumbs'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 60 } },
      });
      expect(scrollToIndex).toHaveBeenLastCalledWith({ index: 1, viewPosition: 0.5, animated: false });
      rerender(<ImageThumbStrip images={images} selectedIndex={2} onSelect={onSelect} testID="strip" />);
      expect(scrollToIndex).toHaveBeenLastCalledWith({ index: 2, viewPosition: 0.5, animated: true });
    } finally {
      scrollToIndex.mockRestore();
    }
  });

  it('counts the side padding in the item offsets so centring is exact', () => {
    setup();
    const list = screen.UNSAFE_getByType(FlatList);
    const padding = list.props.contentContainerStyle.paddingHorizontal;
    expect(padding).toBeGreaterThan(0);
    expect(list.props.getItemLayout(null, 0).offset).toBe(padding);
    const step = list.props.getItemLayout(null, 1).offset - padding;
    expect(list.props.getItemLayout(null, 2).offset).toBe(padding + 2 * step);
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
