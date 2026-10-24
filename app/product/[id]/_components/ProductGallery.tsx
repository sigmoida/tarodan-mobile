import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { AppImage } from '@/components/AppImage';
import { IMAGE_PLACEHOLDER, resolveImageUrl } from '@/utils/imageUrl';
import { GlassSurface, Text, theme } from '@/ui';
import type { ProductImage } from '../_lib/types';
import { useThumbPager } from '../_hooks/useThumbPager';
import { ImageThumbStrip } from './ImageThumbStrip';
import { useGallerySize } from '../_lib/layout';

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
 * Paged horizontal image gallery: an edge-to-edge SQUARE (window width on phones; capped and centred,
 * or beside the info column, on tablets: `useGallerySize`) that runs up under the status
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
}: {
  images: ProductImage[];
  currentImage: number;
  onPageChange: (page: number) => void;
  onOpenViewer: (index: number) => void;
}) {
  const { t } = useTranslation();
  const width = useGallerySize();
  const total = images.length;
  const pager = useThumbPager({ width, total, current: currentImage, onPageChange });

  // So swiping never shows an empty frame, prefetch the neighbours (expo-image disk + memory cache;
  // AppImage uses the same `memory-disk` policy). The key is the URL set, not the array: a refetch
  // brings a new `images` array, but the same neighbours are not requested again.
  const neighborKey = neighborImageUrls(images, currentImage).join('\n');
  useEffect(() => {
    if (!neighborKey || typeof Image.prefetch !== 'function') return;
    try {
      void Image.prefetch(neighborKey.split('\n'), 'memory-disk')?.catch(() => undefined);
    } catch {
      // prefetching is only a speed-up: a failure must not affect display
    }
  }, [neighborKey]);

  // One style object per width, so the memoised page images skip re-renders of the screen.
  const pageStyle = useMemo(() => ({ width, aspectRatio: 1 }), [width]);

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
          style={pageStyle}
          contentFit="cover"
        />
      </Pressable>
    ),
    [onOpenViewer, pageStyle, t],
  );

  return (
    <View style={[styles.root, { width }]}>
      <View style={{ width, aspectRatio: 1 }}>
        <FlatList
          data={images}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          {...pager.pagerProps}
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
            viewportWidth={width}
            testID="product-gallery"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Centred when the square is narrower than the screen (medium windows).
  root: { alignSelf: 'center' },
  indicatorsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[3],
    alignItems: 'center',
  },
  counter: { paddingHorizontal: spacing[3] },
  stripWrap: { paddingTop: spacing[3] },
});
