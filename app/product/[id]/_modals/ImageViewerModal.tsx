import React, { useCallback, useEffect, useRef, useState } from 'react';
// Tam ekran görsel görüntüleyici (web ProductLightbox): `@/ui` Modal bir diyalog kartıdır; burada çerçevesiz,
// tam ekran native Modal gerekir (jest + zoom jesti için GestureHandlerRootView modalın İÇİNDE).
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon, Text, theme, useHeaderTopInset, useModalPresence } from '@/ui';
import { AppImage } from '@/components/AppImage';
import ZoomableImage from '@/components/product/ZoomableImage';

const { colors, spacing, radius } = theme;

/** Küçük resim karesinin kenarı (56-64pt aralığı). */
export const THUMB_SIZE = 60;
const THUMB_GAP = spacing[2];
const THUMB_BORDER = 2;

const imageUri = (img: any): string => (typeof img === 'string' ? img : img.url);

/**
 * Tam ekran görsel görüntüleyici: beyaz zemin, büyük fotoğraf (yatay sayfalı, pinch + çift dokunma
 * zoom), altta küçük resim şeridi. Büyük fotoğraf kaydırılınca seçili küçük resim senkron döner ve
 * görünür alana kayar; küçük resme dokununca o fotoğrafa geçilir. Galeriden dokunulan indeksle açılır.
 * Gövde yalnız görünürken bağlanır → her açılışta indeks/zoom sıfırdan başlar.
 */
export function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: any[];
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
      {/* Modal Android'de yeni native pencere açtığı için root view modal içinde olmalı */}
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
  images: any[];
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
  // Küçük resimle sayfa değişince eski sayfanın zoom'u sıfırlansın (zoomed bayrağı takılı kalmasın).
  const [resetKey, setResetKey] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const stripRef = useRef<FlatList>(null);

  // Seçili küçük resmi şeridin ortasına kaydır (kaydırmayla ya da dokunmayla değişse de).
  useEffect(() => {
    if (total < 2) return;
    stripRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  }, [index, total]);

  const onPagerScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next >= 0 && next < total) setIndex((prev) => (prev === next ? prev : next));
    },
    [width, total],
  );

  const selectThumb = (i: number) => {
    setZoomed(false);
    setResetKey((k) => k + 1);
    setIndex(i);
    pagerRef.current?.scrollTo({ x: i * width, y: 0, animated: true });
  };

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

      <ScrollView
        ref={pagerRef}
        testID="image-viewer-pager"
        style={styles.pager}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: startIndex * width, y: 0 }}
        scrollEventThrottle={16}
        onScroll={onPagerScroll}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
      >
        {images.map((img: any, i: number) => (
          <ZoomableImage
            key={`${i}-${resetKey}`}
            uri={imageUri(img)}
            zoomed={zoomed}
            onZoomChange={setZoomed}
            areaHeight={pageHeight}
          />
        ))}
      </ScrollView>

      {total > 1 ? (
        <View style={[styles.stripWrap, { paddingBottom: bottomInset + spacing[3] }]}>
          <FlatList
            ref={stripRef}
            testID="image-viewer-thumbs"
            data={images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({
              length: THUMB_SIZE + THUMB_GAP,
              offset: (THUMB_SIZE + THUMB_GAP) * i,
              index: i,
            })}
            contentContainerStyle={styles.stripContent}
            ItemSeparatorComponent={ThumbGap}
            renderItem={({ item, index: i }) => {
              const selected = i === index;
              return (
                <Pressable
                  testID={`image-viewer-thumb-${i}`}
                  onPress={() => selectThumb(i)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${i + 1} / ${total}`}
                  accessibilityState={{ selected }}
                  style={[styles.thumb, selected && styles.thumbSelected]}
                >
                  <AppImage
                    source={imageUri(item)}
                    recyclingKey={String(i)}
                    style={styles.thumbImage}
                    contentFit="cover"
                  />
                </Pressable>
              );
            }}
          />
        </View>
      ) : (
        <View style={{ height: bottomInset }} />
      )}
    </>
  );
}

const ThumbGap = () => <View style={styles.gap} />;

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
  stripContent: { paddingHorizontal: spacing[4] },
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
