import React from 'react';
import { View, ScrollView, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

/**
 * Yatay sayfalı görsel galerisi — kenardan kenara KARE (pencere genişliği), durum çubuğunun altına kadar
 * uzanır (üstte kabuk/üst bar yok; yüzen adalar fotoğrafın üstünde durur ki Liquid Glass fotoğrafı
 * göstersin). `cover`: web galerisi gibi kareyi doldurur, yanlarda boşluk kalmaz; tam fotoğraf
 * dokununca açılan görüntüleyicide. Sayfa göstergesi fotoğrafın alt kenarında, yarı saydam hap içinde.
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
  return (
    <View style={{ width, height: width }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => onPageChange(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
      >
        {images.map((img: any, index: number) => {
          const uri = typeof img === 'string' ? img : img.url;
          return (
            <Pressable
              key={index}
              onPress={() => onOpenViewer(index)}
              accessibilityRole="imagebutton"
              accessibilityLabel={t('product.zoomPhotoA11y')}
            >
              <Image source={{ uri }} style={[styles.productImage, { width, height: width }]} resizeMode="cover" />
            </Pressable>
          );
        })}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.indicatorsWrap} pointerEvents="none">
          <View style={styles.indicators} testID="product-gallery-dots">
            {images.map((_: any, index: number) => (
              <View key={index} style={[styles.indicator, currentImage === index && styles.indicatorActive]} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  productImage: { backgroundColor: colors.surface.alt },
  indicatorsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[3],
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.black20,
  },
  indicator: {
    width: spacing[2],
    height: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.overlay.white70,
  },
  indicatorActive: { backgroundColor: colors.white, width: spacing[4] },
});
