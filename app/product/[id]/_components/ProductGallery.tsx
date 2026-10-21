import React, { useCallback, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { AppImage } from '@/components/AppImage';
import { IMAGE_PLACEHOLDER, resolveImageUrl } from '@/utils/imageUrl';
import { GlassSurface, Text, theme } from '@/ui';
import type { ProductImage } from '../_lib/types';
import { useThumbPager } from '../_hooks/useThumbPager';
import { ImageThumbStrip, THUMB_SIZE } from './ImageThumbStrip';

const { spacing } = theme;

/** Height of the page counter pill (pt). */
const COUNTER_HEIGHT = 28;

/**
 * Detail image URLs of the neighbouring pages (next, previous). The gallery and the full-screen
 * viewer load the same detail variant, so a prefetched frame comes from the cache in both.
 */
function neighborImageUrls(images: ProductImage[], current: number): string[] {
  return [current + 1, current - 1]
    .filter((i) => i >= 0 && i < images.length)
    .map((i) => resolveImageUrl(images[i], 'detail'))
    .filter((uri) => uri !== IMAGE_PLACEHOLDER);
}

/**
 * Paged horizontal image gallery: an edge-to-edge SQUARE (window width) that runs up under the status
 * bar (no shell or top bar above it; the floating islands sit over the photo so Liquid Glass has a
 * photo to show), followed by the thumbnail strip. `cover` fills the square like the web gallery,
 * with no side gaps; the full photo is in the viewer opened by tapping the image. The page counter is
 * a small glass pill at the bottom edge of the photo, "2 / 5" in dark text (no opacity animation: iOS 26
 * glass loses its effect below opacity 1). Pages are virtual: only the visible and neighbouring frames
 * are mounted, and neighbouring images are prefetched. No badges: swap, discount and sold-out info
 * sit in the badge row under the price (`ProductBadgeRow`).
 *
 * Tapping a thumbnail only pages the main image to that photo (it never opens the viewer); tapping
 * the main image opens the viewer at that photo (ADR 0013). The strip is hidden for a single image.
 */
export function ProductGallery({
  images,
  currentImage,
  onPageChange,
  onOpenViewer,
  reserveStrip = false,
}: {
  images: ProductImage[];
  currentImage: number;
  onPageChange: (page: number) => void;
  onOpenViewer: (index: number) => void;
  /**
   * Keep the strip's space when there is one image: the list-cache placeholder carries only the
   * cover, and the full product may bring more.
   */
  reserveStrip?: boolean;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const total = images.length;
  const pager = useThumbPager({ width, total, current: currentImage, onPageChange });

  // So swiping never shows an empty frame, prefetch the neighbours (expo-image disk + memory cache;
  // AppImage uses the same `memory-disk` policy). The key is the URL set: the screen builds a new
  // `images` array on every render, but the same neighbours are not requested again.
  const neighborKey = neighborImageUrls(images, currentImage).join('\n');
  useEffect(() => {
    if (!neighborKey || typeof Image.prefetch !== 'function') return;
    try {
      void Image.prefetch(neighborKey.split('\n'), 'memory-disk')?.catch(() => undefined);
    } catch {
      // prefetching is only a speed-up: a failure must not affect display
    }
  }, [neighborKey]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ProductImage>) => (
      <Pressable
        onPress={() => onOpenViewer(index)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('product.zoomPhotoA11y')}
      >
        <AppImage
          source={item}
          variant="detail"
          // If the screen is reused for another product the old image must not linger: key on the image itself.
          recyclingKey={
            typeof item === 'string' ? item : (item.detailUrl ?? item.url ?? String(index))
          }
          style={{ width, aspectRatio: 1 }}
          contentFit="cover"
        />
      </Pressable>
    ),
    [onOpenViewer, t, width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  return (
    <View>
      <View style={{ width, aspectRatio: 1 }}>
        <FlatList
          ref={pager.pagerRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          onScroll={pager.onScroll}
          onScrollBeginDrag={pager.onScrollBeginDrag}
          onMomentumScrollEnd={pager.onMomentumScrollEnd}
          scrollEventThrottle={16}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
        />

        {total > 1 && (
          <View style={styles.indicatorsWrap} pointerEvents="none">
            <View testID="product-gallery-dots">
              <GlassSurface
                shape="pill"
                size={COUNTER_HEIGHT}
                style={styles.counter}
                accessible
                accessibilityLabel={t('product.galleryPageA11y', { current: currentImage + 1, total })}
              >
                <Text variant="caption" weight="bold" tone="heading" testID="product-gallery-counter">
                  {currentImage + 1} / {total}
                </Text>
              </GlassSurface>
            </View>
          </View>
        )}
      </View>

      {total > 1 ? (
        <View style={styles.stripWrap}>
          <ImageThumbStrip
            images={images}
            selectedIndex={currentImage}
            onSelect={pager.scrollToPage}
            testID="product-gallery"
          />
        </View>
      ) : reserveStrip ? (
        // Keeps the strip's height while the list-cache placeholder (one image) is shown, so the
        // title does not jump when the full product brings the other images.
        <View style={styles.stripWrap} testID="product-gallery-thumbs-reserved">
          <View style={styles.stripReserve} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  indicatorsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[3],
    alignItems: 'center',
  },
  counter: { paddingHorizontal: spacing[3] },
  stripWrap: { paddingTop: spacing[3] },
  stripReserve: { height: THUMB_SIZE },
});
