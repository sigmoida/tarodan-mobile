import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Radio, RawText, theme } from '@/ui';
import { buildSortOptions } from '@/utils/productFilters';

const { colors, spacing, typography } = theme;

/**
 * Ürün listelerinin TEK sıralama seçicisi (web ilan başlığındaki sıralama Select'inin karşılığı):
 * Önerilen, En Yeni, En Eski, Popüler, Fiyat, Puan, A-Z, Z-A. Seçince hemen uygular ve kapanır.
 * Arama, ilanlar ve kategori aynı bileşeni kullanır.
 */
export function ProductSortModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (sortBy: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const options = useMemo(() => buildSortOptions(t), [t]);
  return (
    <Modal isOpen={visible} onClose={onClose} title={t('common.sort')}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={styles.row}
          onPress={() => onSelect(option.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === option.value }}
        >
          <RawText style={[styles.label, value === option.value && styles.labelActive]}>{option.label}</RawText>
          <Radio checked={value === option.value} onChange={() => onSelect(option.value)} />
        </Pressable>
      ))}
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.heading,
  },
  labelActive: { fontWeight: typography.fontWeight.semibold, color: colors.primary[600] },
});
