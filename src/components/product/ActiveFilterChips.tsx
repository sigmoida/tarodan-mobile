import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, RawText, theme } from '@/ui';

const { colors, spacing, typography } = theme;

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Aktif filtre çipleri (web `ActiveFilterChips`): "Filtreler:" etiketi, her filtre için kaldırılabilir
 * seçili çip (etiket + X) ve "Filtreleri Temizle". Listelenecek çip yoksa hiçbir şey çizilmez.
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
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="active-filter-chips"
    >
      <RawText style={styles.label}>{t('product.filters')}:</RawText>
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
      <Pressable onPress={onClear} hitSlop={theme.spacing[2]} accessibilityRole="button" style={styles.clear}>
        <RawText style={styles.clearText}>{t('product.clearFilters')}</RawText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: spacing[1],
  },
  clear: { paddingHorizontal: spacing[1] },
  clearText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
});
