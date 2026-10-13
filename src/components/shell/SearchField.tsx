import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon } from '@/ui';

const { colors, spacing, iconSize, controlHeight, radiusRole } = theme;

export interface SearchFieldProps {
  onPress: () => void;
  /** Boşken gösterilen metin; verilmezse web ile aynı `nav.searchPlaceholder`. */
  placeholder?: string;
  testID?: string;
}

/**
 * Üst bardaki arama alanı — dokununca arama ekranını açan SAHTE alan (düzenlenemez). Arama,
 * öneri ve son aramalar tek yerde (arama ekranı) yaşar; tab kökleri yalnız oraya götürür.
 */
export const SearchField: React.FC<SearchFieldProps> = ({ onPress, placeholder, testID }) => {
  const { t } = useTranslation();
  const label = placeholder ?? t('nav.searchPlaceholder');
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="search"
      accessibilityLabel={label}
      style={styles.field}
    >
      <Icon name="magnifying-glass" size={iconSize.md} color={colors.text.muted} />
      <Text variant="body" tone="muted" numberOfLines={1} style={styles.placeholder}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minWidth: 0,
    height: controlHeight.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radiusRole.input,
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    flex: 1,
  },
});
