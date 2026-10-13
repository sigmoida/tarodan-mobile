import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { GlassSurface, Text, theme } from '@/ui';

const { spacing } = theme;

/** Sayfa göstergesi hapının yüksekliği (pt). */
const COUNTER_HEIGHT = 28;

/**
 * Yatay sayfalı görsel galerisi — kenardan kenara KARE (pencere genişliği), durum çubuğunun altına kadar
 * uzanır (üstte kabuk/üst bar yok; yüzen adalar fotoğrafın üstünde durur ki Liquid Glass fotoğrafı
 * göstersin). `cover`: web galerisi gibi kareyi doldurur, yanlarda boşluk kalmaz; tam fotoğraf
 * dokununca açılan görüntüleyicide. Sayfa göstergesi fotoğrafın alt kenarında küçük cam hap içinde
 * "2 / 5" (koyu metin; opacity animasyonu YOK — iOS 26 cam opacity < 1'de efekti kaybeder).
 * Sayfalar sanal: yalnız görünen ve komşu kareler bağlanır.
 */
export function ProductGallery({
  images,
  currentImage,
  onPageChange,
  onOpenViewer,
}: {
  images: any[];
  currentImage: number;
  onPageChange: (page: number) => void;
  onOpenViewer: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const total = images.length;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<any>) => (
      <Pressable
        onPress={() => onOpenViewer(index)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('product.zoomPhotoA11y')}
      >
        <AppImage
          source={item}
          variant="detail"
          // Aynı ekran başka ürünle yeniden kullanılırsa eski görsel kısa süre kalmasın: anahtar görselin kendisi.
          recyclingKey={
            typeof item === 'string' ? item : (item?.detailUrl ?? item?.url ?? String(index))
          }
          style={{ width, aspectRatio: 1 }}
          contentFit="cover"
        />
      </Pressable>
    ),
    [onOpenViewer, t, width],
  );

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      if (page >= 0 && page < total) onPageChange(page);
    },
    [onPageChange, total, width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  return (
    <View style={{ width, aspectRatio: 1 }}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
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
});
