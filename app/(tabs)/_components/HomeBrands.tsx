import React, { useState } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { Text } from '@/ui';
import { resolveImageUrl } from '@/utils/imageUrl';
import { goBrand } from '../_lib/nav';
import { homeStyles as styles } from '../_lib/homeStyles';

type Manufacturer = { id: string; name: string; logo?: string | null };

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
    <Image
      source={{ uri: resolveImageUrl(brand.logo) }}
      style={styles.brandLogo}
      resizeMode="contain"
      accessibilityLabel={brand.name}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Üreticiler şeridi (web `BrandsMarquee`): logolu 96×56 kutular; logosuz üreticide ad. Bölüm kartı
 * yok (web'de de bant). Dokununca üreticiye göre filtrelenmiş arama açılır. Üretici yoksa çizilmez.
 */
export function BrandsStrip({ items }: { items: Manufacturer[] }) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
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
