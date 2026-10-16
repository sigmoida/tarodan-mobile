import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Skeleton, Text, theme } from '@/ui';
import { goBrand } from '../_lib/nav';
import { homeStyles as styles } from '../_lib/homeStyles';

type Manufacturer = { id: string; name: string; logo?: string | null };

/** Yüklenirken çizilen kutu sayısı — 360pt ekranı doldurur. */
const SKELETON_TILES = [0, 1, 2, 3, 4];

function BrandMark({ brand }: { brand: Manufacturer }) {
  const [failed, setFailed] = useState(false);
  if (!brand.logo || failed) {
    return (
      <Text variant="caption" tone="muted" weight="semibold" align="center" numberOfLines={2}>
        {brand.name}
      </Text>
    );
  }
  return (
    <AppImage
      source={brand.logo}
      style={styles.brandLogo}
      resizeMode="contain"
      accessibilityLabel={brand.name}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Üreticiler şeridi (web `BrandsMarquee`): logolu 96×56 kutular; logosuz üreticide ad. Bölüm kartı
 * yok (web'de de bant). Dokununca üreticiye göre filtrelenmiş arama açılır. Yüklenirken aynı
 * yükseklikte iskelet kutular (veri gelince alttaki raylar zıplamasın); üretici yoksa çizilmez.
 */
export function BrandsStrip({ items, isLoading = false }: { items: Manufacturer[]; isLoading?: boolean }) {
  if (isLoading && items.length === 0) {
    return (
      <ScrollView
        horizontal
        scrollEnabled={false}
        style={styles.brandsScroll}
        contentContainerStyle={styles.brandsRow}
        testID="home-brands-skeleton"
      >
        {SKELETON_TILES.map((i) => (
          <Skeleton key={i} style={local.tileSkeleton} />
        ))}
      </ScrollView>
    );
  }
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.brandsScroll}
      contentContainerStyle={styles.brandsRow}
      testID="home-brands"
    >
      {items.map((brand) => (
        <Pressable
          key={brand.id ?? brand.name}
          onPress={() => goBrand(brand)}
          accessibilityRole="button"
          accessibilityLabel={brand.name}
          style={({ pressed }) => [styles.brandTile, pressed && styles.pressed]}
        >
          <BrandMark brand={brand} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const { spacing, radiusRole } = theme;

const local = StyleSheet.create({
  // Yüklenirken kutu: `homeStyles.brandTile` ile aynı ölçü (şerit yüksekliği sabit kalır).
  tileSkeleton: { width: spacing[24], height: spacing[16] - spacing[2], borderRadius: radiusRole.productCard },
});
