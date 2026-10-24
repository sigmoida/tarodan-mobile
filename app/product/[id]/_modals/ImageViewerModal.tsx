import React, { useCallback, useState } from 'react';
// Full-screen image viewer (web ProductLightbox): `@/ui` Modal is a dialog card; here a frameless,
// full-screen native Modal is needed (for jest and the zoom gesture, GestureHandlerRootView goes INSIDE the modal).
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions, type ListRenderItemInfo } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon, Text, theme, useHeaderTopInset, useModalPresence } from '@/ui';
import ZoomableImage from '@/components/product/ZoomableImage';
import { resolveImageUrl } from '@/utils/imageUrl';
import { ImageThumbStrip } from '../_components/ImageThumbStrip';
import { useThumbPager } from '../_hooks/useThumbPager';
import type { ProductImage } from '../_lib/types';

const { colors, spacing } = theme;

/**
 * Full-screen image viewer: white background, a large photo (horizontal pager, pinch + double-tap
 * zoom) and the shared thumbnail strip below it. Swiping the large photo moves the selected
 * thumbnail in sync and scrolls it into view; tapping a thumbnail jumps to that photo. It opens at
 * the index tapped in the gallery. The body mounts only while visible, so the index and zoom start
 * fresh on every open. The large pages are virtual (FlatList, `windowSize` 3): only the visible and
 * neighbouring ZoomableImage mount, so a listing with dozens of photos does not open them all at
 * once (each carries a gesture and a full-size bitmap).
 */
export function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: ProductImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  useModalPresence(visible);
  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* On Android a Modal opens a new native window, so the root view must be inside the modal */}
      <GestureHandlerRootView style={styles.container}>
        {visible ? <ViewerBody images={images} initialIndex={initialIndex} onClose={onClose} /> : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function ViewerBody({
  images,
  initialIndex,
  onClose,
}: {
  images: ProductImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const topInset = useHeaderTopInset();
  const bottomInset = useSafeAreaInsets().bottom;
  const total = images.length;
  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0));

  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | undefined>(undefined);
  // When a thumbnail changes the page, reset the old page's zoom (so the zoomed flag cannot stick).
  const [resetKey, setResetKey] = useState(0);
  const pager = useThumbPager({ width, total, current: index, onPageChange: setIndex });
  const { scrollToPage } = pager;

  const selectThumb = useCallback(
    (i: number) => {
      setZoomed(false);
      setResetKey((k) => k + 1);
      scrollToPage(i);
    },
    [scrollToPage],
  );

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<ProductImage>) => (
      <ZoomableImage uri={resolveImageUrl(item, 'detail')} zoomed={zoomed} onZoomChange={setZoomed} areaHeight={pageHeight} />
    ),
    [zoomed, pageHeight],
  );

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.header, { height: topInset + spacing[2] + theme.minTouchTarget, paddingTop: topInset + spacing[2] }]}>
        {total > 1 ? (
          <Text variant="caption" tone="muted" testID="image-viewer-counter">
            {index + 1} / {total}
          </Text>
        ) : null}
        <Pressable
          testID="image-viewer-close"
          style={[styles.close, { top: topInset + spacing[2] }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Icon name="x-mark" size={theme.iconSize.lg} color={colors.text.heading} />
        </Pressable>
      </View>

      <FlatList
        testID="image-viewer-pager"
        style={styles.pager}
        data={images}
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        // A thumbnail jump changes the key: the pages remount and the old zoom resets.
        keyExtractor={(_, i) => `${i}-${resetKey}`}
        renderItem={renderPage}
        // Re-render the mounted pages when the zoom flag or the page height changes.
        extraData={renderPage}
        initialScrollIndex={startIndex}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
        {...pager.pagerProps}
      />

      {total > 1 ? (
        <View style={[styles.stripWrap, { paddingBottom: bottomInset + spacing[3] }]}>
          <ImageThumbStrip
            images={images}
            selectedIndex={index}
            onSelect={selectThumb}
            testID="image-viewer"
          />
        </View>
      ) : (
        <View style={{ height: bottomInset }} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.elevated },
  header: { justifyContent: 'center', alignItems: 'center' },
  close: {
    position: 'absolute',
    right: spacing[3],
    zIndex: 10,
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: { flex: 1 },
  stripWrap: { paddingTop: spacing[3] },
});
