import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, Text, androidRipple, rippleClip, showPressedStyle, theme } from '@/ui';
import type { CategoryGroup, CategoryTileData } from '../_lib/groups';
import { CategoryTile } from './CategoryTile';

const { colors, spacing, radiusRole } = theme;

export const CATEGORY_GRID_COLUMNS = 3;

/** Son satırdaki boş hücreler (kutular satırı doldurmasın, hizalı kalsın). */
type Cell = CategoryTileData | { id: string; spacer: true };

function withSpacers(tiles: CategoryTileData[]): Cell[] {
  const rest = tiles.length % CATEGORY_GRID_COLUMNS;
  if (rest === 0) return tiles;
  return [
    ...tiles,
    ...Array.from({ length: CATEGORY_GRID_COLUMNS - rest }, (_, i) => ({ id: `spacer-${i}`, spacer: true as const })),
  ];
}

interface CategoryGridProps {
  title: string;
  tiles: CategoryTileData[];
  footer?: CategoryGroup['footer'];
  /** Alt kategori düzeyindeyken başlığın solunda geri oku. */
  canGoBack: boolean;
  onBack: () => void;
  onPressTile: (tile: CategoryTileData) => void;
  onPressFooter: (href: string) => void;
  bottomInset: number;
}

/**
 * Sağ alan: seçili grubun (ya da inilen kategorinin) başlığı + 3 sütunlu ızgara (+ altta bağlantı,
 * ör. "Tüm üreticiler"). Kaydırılabilir; başlık listenin başlığıdır (birlikte kayar).
 */
export function CategoryGrid({
  title,
  tiles,
  footer,
  canGoBack,
  onBack,
  onPressTile,
  onPressFooter,
  bottomInset,
}: CategoryGridProps) {
  const { t } = useTranslation();
  return (
    <FlatList
      style={styles.grid}
      testID="categories-grid"
      data={withSpacers(tiles)}
      numColumns={CATEGORY_GRID_COLUMNS}
      keyExtractor={(cell) => cell.id}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: spacing[4] + bottomInset }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) =>
        'spacer' in item ? <View style={styles.cell} /> : <View style={styles.cell}><CategoryTile tile={item} onPress={onPressTile} /></View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {canGoBack ? (
            <Pressable
              testID="categories-back"
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={onBack}
              hitSlop={spacing[2]}
              android_ripple={androidRipple({ borderless: true, radius: theme.minTouchTarget / 2 })}
              style={({ pressed }) => [styles.back, showPressedStyle(pressed) && styles.pressed]}
            >
              <Icon name="chevron-left" size={theme.iconSize.md} color={colors.text.heading} />
            </Pressable>
          ) : null}
          <Text variant="h3" weight="bold" numberOfLines={1} style={styles.title} accessibilityRole="header" testID="categories-title">
            {title}
          </Text>
        </View>
      }
      ListFooterComponent={
        footer ? (
          <Pressable
            testID="categories-footer-link"
            accessibilityRole="link"
            onPress={() => onPressFooter(footer.href)}
            android_ripple={androidRipple()}
            style={({ pressed }) => [styles.footer, rippleClip(), showPressedStyle(pressed) && styles.pressed]}
          >
            <Text variant="bodySm" weight="semibold" tone="primary">
              {footer.label}
            </Text>
            <Icon name="chevron-right" size={theme.iconSize.sm} color={colors.primary[600]} />
          </Pressable>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1 },
  content: { paddingHorizontal: spacing[2], paddingTop: spacing[3] },
  row: { gap: spacing[1] },
  cell: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[2],
  },
  back: {
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing[2],
  },
  title: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    minHeight: theme.minTouchTarget,
    borderRadius: radiusRole.button,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  pressed: { opacity: 0.85 },
});
