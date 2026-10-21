/**
 * Shared thumbnail strip: card-size URLs, selected state, accessibility, auto-scroll of the
 * selected thumbnail and the single-image guard.
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

  it('scrolls the selected thumbnail into view when the selection changes', () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    try {
      const { rerender, onSelect } = setup();
      scrollToIndex.mockClear();
      rerender(<ImageThumbStrip images={images} selectedIndex={2} onSelect={onSelect} testID="strip" />);
      expect(scrollToIndex).toHaveBeenCalledWith({ index: 2, viewPosition: 0.5, animated: true });
    } finally {
      scrollToIndex.mockRestore();
    }
  });

  it('renders nothing for fewer than two images', () => {
    setup({ images: [images[0]] });
    expect(screen.queryByTestId('strip-thumbs')).toBeNull();
    expect(screen.queryByTestId('strip-thumb-0')).toBeNull();
  });
});
