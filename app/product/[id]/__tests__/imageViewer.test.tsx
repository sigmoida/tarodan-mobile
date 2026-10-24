/**
 * Image viewer: opening index, jumping by thumbnail tap, thumbnail sync when the large photo is
 * swiped, no strip or counter for a single photo, card-size thumbnails.
 */
import React from 'react';
import { Dimensions } from 'react-native';
import { Image } from 'expo-image';
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
  it('opens at the given index: counter and selected thumbnail', () => {
    open({ initialIndex: 1 });
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('2 / 3');
    expect(selected(1)).toBe(true);
    expect(selected(2)).toBe(false);
  });

  it('tapping a thumbnail changes the index', () => {
    open();
    fireEvent.press(screen.getByTestId('image-viewer-thumb-2'));
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('3 / 3');
    expect(selected(2)).toBe(true);
    expect(selected(0)).toBe(false);
  });

  it('swiping the large photo moves the selected thumbnail', () => {
    open();
    const { width } = Dimensions.get('window');
    // The pager is a virtual list (FlatList): the event carries the measurements too.
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

  it('keeps the tapped thumbnail selected while the pager animates past the pages in between', () => {
    open();
    const { width } = Dimensions.get('window');
    const pager = screen.getByTestId('image-viewer-pager');
    const metrics = {
      contentSize: { width: width * 3, height: 600 },
      layoutMeasurement: { width, height: 600 },
    };
    fireEvent.press(screen.getByTestId('image-viewer-thumb-2'));
    fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 }, ...metrics } });
    expect(screen.getByTestId('image-viewer-counter')).toHaveTextContent('3 / 3');
    expect(selected(2)).toBe(true);
    fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width * 2, y: 0 }, ...metrics } });
    // Target reached: swipes report pages again.
    fireEvent.scroll(pager, { nativeEvent: { contentOffset: { x: width, y: 0 }, ...metrics } });
    expect(selected(1)).toBe(true);
  });

  it('the X closes the viewer', () => {
    const onClose = open();
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows no strip and no counter for a single photo', () => {
    open({ images: [images[0]] });
    expect(screen.queryByTestId('image-viewer-thumbs')).toBeNull();
    expect(screen.queryByTestId('image-viewer-counter')).toBeNull();
  });

  it('mounts pages virtually: not all at once, the opened page is mounted', () => {
    const many = Array.from({ length: 12 }, (_, i) => `https://x/${i}.jpg`);
    open({ images: many, initialIndex: 6 });
    expect(screen.getByTestId('zoom-https://x/6.jpg')).toBeTruthy();
    expect(screen.queryAllByTestId(/^zoom-/).length).toBeLessThan(many.length);
    expect(screen.queryByTestId('zoom-https://x/0.jpg')).toBeNull();
  });

  it('does not mount the content while closed', () => {
    open({ visible: false });
    expect(screen.queryByTestId('image-viewer-pager')).toBeNull();
  });

  it('loads the card-size URL in the thumbnails and the detail URL in the pages', () => {
    const resolved = [
      { url: 'https://x/a-detail.jpg', detailUrl: 'https://x/a-detail.jpg', cardUrl: 'https://x/a-card.jpg' },
      { url: 'https://x/b-detail.jpg', detailUrl: 'https://x/b-detail.jpg', cardUrl: 'https://x/b-card.jpg' },
    ];
    open({ images: resolved });
    expect(screen.getByTestId('zoom-https://x/a-detail.jpg')).toBeTruthy();
    const uris = screen.UNSAFE_getAllByType(Image).map((img) => img.props.source.uri);
    expect(uris).toEqual(expect.arrayContaining(['https://x/a-card.jpg', 'https://x/b-card.jpg']));
    expect(uris).not.toContain('https://x/a-detail.jpg');
  });
});
