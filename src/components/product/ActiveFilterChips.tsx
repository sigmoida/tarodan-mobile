import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RawText, theme } from '@/ui';

const { colors, spacing, typography, radiusRole, iconSize } = theme;

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
        <Pressable
          key={chip.key}
          onPress={chip.onRemove}
          hitSlop={theme.spacing[2]}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.remove')}: ${chip.label}`}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <RawText style={styles.chipText}>{chip.label}</RawText>
          <Ionicons name="close" size={iconSize.sm} color={colors.primary[600]!} />
        </Pressable>
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
  // Web Chip, seçili: border-primary-200 bg-primary-500/10 text-primary-600, rounded-full.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radiusRole.chip,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  pressed: { opacity: 0.7 },
  chipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
  clear: { paddingHorizontal: spacing[1] },
  clearText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
});
