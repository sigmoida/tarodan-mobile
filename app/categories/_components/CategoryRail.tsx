import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, androidRipple, rippleClip, showPressedStyle, theme } from '@/ui';
import type { CategoryGroup, CategoryGroupKey } from '../_lib/groups';

const { colors, spacing } = theme;

/** Sol rayın ekran genişliğine oranı (dar dikey grup listesi). */
const RAIL_WIDTH = '30%';

interface CategoryRailProps {
  groups: CategoryGroup[];
  selectedKey: CategoryGroupKey | undefined;
  onSelect: (key: CategoryGroupKey) => void;
  /** Alt boşluk (güvenli alan) — son grup ekran dibinde kalmasın. */
  bottomInset: number;
}

/**
 * Sol dikey ray: grup listesi (Keşfet / Kategoriler / Üreticiler / Ölçek). Seçili grup yükseltilmiş
 * yüzey + sol vurgu çubuğu + kalın birincil renkli metinle öne çıkar; kaydırılabilir.
 */
export function CategoryRail({ groups, selectedKey, onSelect, bottomInset }: CategoryRailProps) {
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
        return (
          <Pressable
            key={group.key}
            testID={`categories-rail-${group.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={group.title}
            onPress={() => onSelect(group.key)}
            android_ripple={androidRipple()}
            style={({ pressed }) => [
              styles.item,
              rippleClip(),
              selected && styles.itemSelected,
              showPressedStyle(pressed) && !selected && styles.pressed,
            ]}
          >
            <View style={[styles.accent, selected && styles.accentSelected]} />
            <Text
              variant="label"
              weight={selected ? 'bold' : 'medium'}
              tone={selected ? 'primary' : 'body'}
              numberOfLines={2}
              style={styles.label}
            >
              {group.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: RAIL_WIDTH,
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
  pressed: { opacity: 0.85 },
  accent: { alignSelf: 'stretch', width: spacing[1], backgroundColor: colors.transparent },
  accentSelected: { backgroundColor: colors.primary[600] },
  label: { flex: 1, paddingLeft: spacing[3], paddingVertical: spacing[3] },
});
