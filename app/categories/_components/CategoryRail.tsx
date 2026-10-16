import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, androidRipple, rippleClip, theme } from '@/ui';
import { CATEGORY_RAIL_WIDTH } from '../_lib/layout';
import type { CategoryGroup, CategoryGroupKey } from '../_lib/groups';
import { pressedStyle } from '../_lib/press';

const { colors, spacing } = theme;

interface CategoryRailProps {
  groups: CategoryGroup[];
  selectedKey: CategoryGroupKey | undefined;
  onSelect: (key: CategoryGroupKey) => void;
  /** Alt boşluk (güvenli alan) — son grup ekran dibinde kalmasın. */
  bottomInset: number;
}

/**
 * Sol dikey ray: grup listesi (Keşfet / Kategoriler / Üreticiler / Ölçek). Seçili grup yükseltilmiş
 * yüzey + sol vurgu çubuğu + kalın birincil renkli metinle öne çıkar; kaydırılabilir. Kaynağı düşen
 * grup rayda kalır ve altında "Yüklenemedi" der (sessizce kaybolmaz).
 */
export function CategoryRail({ groups, selectedKey, onSelect, bottomInset }: CategoryRailProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={styles.rail}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}
      accessibilityRole="tablist"
      testID="categories-rail"
    >
      {groups.map((group) => {
        const selected = group.key === selectedKey;
        const failed = group.status === 'error';
        return (
          <Pressable
            key={group.key}
            testID={`categories-rail-${group.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={failed ? `${group.title}, ${t('nav.categoriesLoadFailed')}` : group.title}
            onPress={() => onSelect(group.key)}
            android_ripple={androidRipple()}
            style={({ pressed }) => [
              styles.item,
              rippleClip(),
              selected && styles.itemSelected,
              !selected && pressedStyle(pressed),
            ]}
          >
            <View style={[styles.accent, selected && styles.accentSelected]} />
            <View style={styles.labels}>
              <Text
                variant="label"
                weight={selected ? 'bold' : 'medium'}
                tone={selected ? 'primary' : 'body'}
                numberOfLines={2}
              >
                {group.title}
              </Text>
              {failed ? (
                <Text variant="caption" tone="danger" numberOfLines={1} testID={`categories-rail-${group.key}-failed`}>
                  {t('nav.categoriesLoadFailed')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: CATEGORY_RAIL_WIDTH,
    flexGrow: 0,
    backgroundColor: colors.surface.alt,
    borderRightWidth: 1,
    borderRightColor: colors.border.DEFAULT,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.minTouchTarget + spacing[4],
    paddingRight: spacing[2],
    backgroundColor: colors.transparent,
  },
  itemSelected: { backgroundColor: colors.surface.elevated },
  accent: { alignSelf: 'stretch', width: spacing[1], backgroundColor: colors.transparent },
  accentSelected: { backgroundColor: colors.primary[600] },
  labels: { flex: 1, paddingLeft: spacing[3], paddingVertical: spacing[3], gap: spacing[0.5] },
});
