import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { androidRipple, theme } from '@/ui';
import type { ProductImage } from '../_lib/types';

const { colors, spacing, radius } = theme;

/** Thumbnail edge (pt). Inside the 56-64 pt range and above the 44 pt touch target. */
export const THUMB_SIZE = 60;
const THUMB_GAP = spacing[2];
const THUMB_BORDER = 2;
const THUMB_STEP = THUMB_SIZE + THUMB_GAP;

/**
 * Thumbnail strip shared by the product gallery (under the main image) and the full-screen viewer.
 * The selected thumbnail gets a primary border and is kept centred in the strip, whether the
 * selection changed by a tap or by swiping the main image. Thumbnails load the card-size variant
 * (the image object goes to `AppImage`, so `cardUrl` wins over the detail URL). With fewer than
 * two images there is nothing to choose from and nothing is rendered.
 *
 * `testID` is a prefix: the list is `${testID}-thumbs` and the items are `${testID}-thumb-${index}`.
 */
export function ImageThumbStrip({
  images,
  selectedIndex,
  onSelect,
  testID,
  contentContainerStyle,
}: {
  images: ProductImage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testID: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<ProductImage>>(null);
  const total = images.length;
  const selected = Math.min(Math.max(selectedIndex, 0), Math.max(total - 1, 0));

  // Centre the selected thumbnail in the strip.
  useEffect(() => {
    if (total < 2) return;
    listRef.current?.scrollToIndex({ index: selected, viewPosition: 0.5, animated: true });
  }, [selected, total]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: THUMB_STEP, offset: THUMB_STEP * index, index }),
    [],
  );

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

  if (total < 2) return null;

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
      initialScrollIndex={selected}
      getItemLayout={getItemLayout}
      ItemSeparatorComponent={ThumbGap}
      renderItem={renderItem}
      // Fixed height so the strip is part of the first layout (no jump when the thumbnails mount).
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
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
