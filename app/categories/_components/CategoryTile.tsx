import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ListRowCard, Text, androidRipple, rippleClip, theme } from '@/ui';
import { EntityLogo } from '@/components/catalog/EntityLogo';
import type { CategoryTileData } from '../_lib/groups';
import { pressedStyle } from '../_lib/press';

const { spacing, radiusRole } = theme;

interface CategoryTileProps {
  tile: CategoryTileData;
  onPress: (tile: CategoryTileData) => void;
}

/**
 * Izgara kutusu (3 sütun hücresi). `logo`: görsel kutusu (logo, yoksa baş harf) + etiket (+ "N ürün");
 * `plain`: yalnız etiketli çerçeveli kutu (Keşfet, Ölçek, alt düzeydeki "Tümü"). İkisi de ≥44pt
 * dokunma, Android ripple / iOS basılı opaklık (`@/ui` yardımcıları). `memo`: `tile` ve `onPress`
 * sabit kaldıkça ızgara yeniden çizilirken kutu yeniden çizilmez.
 */
function CategoryTileBase({ tile, onPress }: CategoryTileProps) {
  const { t } = useTranslation();
  const testID = `categories-tile-${tile.id}`;
  const count = tile.count != null ? t('payment.itemsCount', { count: tile.count }) : undefined;
  const accessibilityLabel = count ? `${tile.label}, ${count}` : tile.label;

  if (tile.visual === 'plain') {
    return (
      <ListRowCard
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        onPress={() => onPress(tile)}
        padding={1}
        direction="column"
        style={styles.plain}
      >
        {/* Dar hücrede uzun tek kelime ("Koleksiyonlar") ortadan bölünmesin: sığmazsa küçülür. */}
        <Text
          variant="bodySm"
          weight="semibold"
          align="center"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {tile.label}
        </Text>
      </ListRowCard>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onPress(tile)}
      android_ripple={androidRipple()}
      style={({ pressed }) => [styles.logo, rippleClip(), pressedStyle(pressed)]}
    >
      <EntityLogo logo={tile.logo} name={tile.label} />
      <Text variant="caption" weight="medium" align="center" numberOfLines={2}>
        {tile.label}
      </Text>
      {count ? (
        <Text variant="caption" tone="subtle" align="center" numberOfLines={1}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const CategoryTile = React.memo(CategoryTileBase);

const styles = StyleSheet.create({
  plain: {
    flex: 1,
    justifyContent: 'center',
    minHeight: theme.controlHeight.xl,
  },
  logo: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    minHeight: theme.minTouchTarget,
    borderRadius: radiusRole.card,
  },
});
