import React from 'react';
import { View, ScrollView, Image, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;
const { width } = Dimensions.get('window');

/** Yatay sayfalı görsel galerisi + sayfa göstergeleri (kaydırma: platform kalıbı). Dokununca görüntüleyici açılır. */
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
  return (
    <>
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
              <Image source={{ uri }} style={styles.productImage} resizeMode="contain" />
            </Pressable>
          );
        })}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.imageIndicators}>
          {images.map((_: any, index: number) => (
            <View key={index} style={[styles.indicator, currentImage === index && styles.indicatorActive]} />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  productImage: { width, height: width, backgroundColor: colors.surface.alt },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.DEFAULT,
  },
  indicator: {
    width: spacing[2],
    height: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.border.strong,
  },
  indicatorActive: { backgroundColor: colors.primary[500], width: spacing[6] },
});
