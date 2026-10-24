import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { androidRipple, theme } from '@/ui';
import type { ProductImage } from '../_lib/types';

const { colors, spacing, radius } = theme;

/** Thumbnail edge (pt), ADR 0013. Inside the 56-64 pt range and above the 44 pt touch target. */
export const THUMB_SIZE = 60;
const THUMB_GAP = spacing[2];
const THUMB_BORDER = 2;
const THUMB_STEP = THUMB_SIZE + THUMB_GAP;
const STRIP_PADDING = spacing[4];

/**
 * Scroll offset that puts thumbnail `index` in the middle of a `viewport`-wide strip, clamped to the
 * content (the list itself clamps only at 0, and an iOS scroll view with bounce keeps an offset past
 * the end, which would leave blank space after the last thumbnail).
 */
export function centredThumbOffset(
  index: number,
  count: number,
  viewport: number,
  edgePadding: number = STRIP_PADDING,
): number {
  const content = 2 * edgePadding + count * THUMB_SIZE + Math.max(count - 1, 0) * THUMB_GAP;
  const centre = edgePadding + index * THUMB_STEP + THUMB_SIZE / 2;
  return Math.min(Math.max(centre - viewport / 2, 0), Math.max(content - viewport, 0));
}

type StripProps = {
  images: ProductImage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testID: string;
  /** Expected strip width (pt) for the first frame; defaults to the window width (the viewer). */
  viewportWidth?: number;
  /**
   * Side padding of the thumbnails (pt). Default: the page gutter of an edge-to-edge strip. 0 when
   * the strip sits under an inset gallery (tablet split), so the thumbnails line up with its edges.
   */
  edgePadding?: number;
};

/**
 * Thumbnail strip shared by the product gallery (under the main image) and the full-screen viewer.
 * The selected thumbnail gets a primary border and is kept centred in the strip, whether the
 * selection changed by a tap or by swiping the main image. Thumbnails load the card-size variant
 * (the image object goes to `AppImage`, so `cardUrl` wins over the detail URL). With fewer than
 * two images there is nothing to choose from and nothing is rendered.
 *
 * `testID` is a prefix: the list is `${testID}-thumbs` and the items are `${testID}-thumb-${index}`.
 */
export function ImageThumbStrip(props: StripProps) {
  if (props.images.length < 2) return null;
  return <ThumbList {...props} />;
}

function ThumbList({ images, selectedIndex, onSelect, testID, viewportWidth, edgePadding = STRIP_PADDING }: StripProps) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<ProductImage>>(null);
  const total = images.length;
  const selected = Math.min(Math.max(selectedIndex, 0), total - 1);
  // The expected width (the gallery square, or the window for the viewer) places the first frame;
  // the measured width of the list then corrects it in place on the first layout.
  const { width: windowWidth } = useWindowDimensions();
  const firstViewport = viewportWidth ?? windowWidth;
  const [initialOffset] = useState(() => ({ x: centredThumbOffset(selected, total, firstViewport, edgePadding), y: 0 }));
  const [viewport, setViewport] = useState(0);
  const centred = useRef(false);

  // Centre the selected thumbnail: in place on the first layout, animated afterwards.
  useEffect(() => {
    if (viewport <= 0) return;
    listRef.current?.scrollToOffset({
      offset: centredThumbOffset(selected, total, viewport, edgePadding),
      animated: centred.current,
    });
    centred.current = true;
  }, [selected, total, viewport, edgePadding]);

  const onLayout = useCallback((e: LayoutChangeEvent) => setViewport(e.nativeEvent.layout.width), []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ProductImage>) => {
      const isSelected = index === selected;
      return (
        <Pressable
          testID={`${testID}-thumb-${index}`}
          onPress={() => onSelect(index)}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('product.galleryPageA11y', { current: index + 1, total })}
          accessibilityState={{ selected: isSelected }}
          android_ripple={androidRipple()}
          style={[styles.thumb, isSelected && styles.thumbSelected]}
        >
          <AppImage source={item} variant="card" style={styles.thumbImage} contentFit="cover" />
        </Pressable>
      );
    },
    [onSelect, selected, t, testID, total],
  );

  return (
    <FlatList
      ref={listRef}
      testID={`${testID}-thumbs`}
      data={images}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, index) => String(index)}
      // Selection lives outside `data`, so tell the list to re-render the items when it changes.
      extraData={selected}
      // A listing has a few dozen small card images at most (15 to 20 by membership tier): render
      // them all, so a strip opened at a late photo has no blank cells before the list catches up.
      initialNumToRender={total}
      contentOffset={initialOffset}
      onLayout={onLayout}
      ItemSeparatorComponent={ThumbGap}
      renderItem={renderItem}
      // Fixed height so the strip is part of the first layout (no jump when the thumbnails mount).
      style={styles.list}
      contentContainerStyle={{ paddingHorizontal: edgePadding }}
    />
  );
}

const ThumbGap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  list: { flexGrow: 0, height: THUMB_SIZE },
  gap: { width: THUMB_GAP },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    borderWidth: THUMB_BORDER,
    borderColor: colors.transparent,
    overflow: 'hidden',
  },
  thumbSelected: { borderColor: colors.primary[500] },
  thumbImage: { width: '100%', height: '100%', backgroundColor: colors.surface.alt },
});
