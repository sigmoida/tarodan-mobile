import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, Text, theme } from '@/ui';

const { spacing } = theme;

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Aktif filtre çipleri (web `ActiveFilterChips`): her filtre için kaldırılabilir seçili çip
 * (etiket + X) ve sondaki "Temizle" metin düğmesi. Listelenecek çip yoksa hiçbir şey çizilmez.
 * Telefonda tek satırda yatay kayar (web'de sarar).
 */
export function ActiveFilterChips({
  chips,
  onClear,
}: {
  chips: ActiveFilterChip[];
  onClear: () => void;
}) {
  const { t } = useTranslation();
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="active-filter-chips"
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          selected
          label={chip.label}
          trailingIcon="x-mark"
          onPress={chip.onRemove}
          accessibilityLabel={`${t('common.remove')}: ${chip.label}`}
        />
      ))}
      <Pressable
        testID="clear-filters"
        onPress={onClear}
        hitSlop={spacing[2]}
        accessibilityRole="button"
        accessibilityLabel={t('product.clearFilters')}
        style={styles.clear}
      >
        <Text variant="caption" weight="medium" tone="primary">
          {t('common.clear')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow:0 → yatay ScrollView dikeyde alan doldurup çipleri germesin.
  scroll: { flexGrow: 0 },
  content: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] },
  clear: { paddingHorizontal: spacing[1] },
});
