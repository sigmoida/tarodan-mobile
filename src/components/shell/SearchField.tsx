import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon, GLASS_ICON_BUTTON_SIZE } from '@/ui';

const { colors, spacing, iconSize, radius } = theme;

export interface SearchFieldProps {
  onPress: () => void;
  /** Boşken gösterilen metin; verilmezse web'in telefon başlığındaki kısa metin `nav.searchPlaceholderMobile` (dar alanda kesilmez). */
  placeholder?: string;
  testID?: string;
}

/**
 * Üst bardaki arama alanı — dokununca arama ekranını açan SAHTE alan (düzenlenemez). Arama,
 * öneri ve son aramalar tek yerde (arama ekranı) yaşar; tab kökleri yalnız oraya götürür. Görünüm:
 * çerçevesiz gri (gray-100) tam yuvarlak hap — arama ekranının vurgulu (primary çerçeveli) kutusundan
 * bilinçli olarak farklı; üst barda sakin durur.
 */
export const SearchField: React.FC<SearchFieldProps> = ({ onPress, placeholder, testID }) => {
  const { t } = useTranslation();
  const label = placeholder ?? t('nav.searchPlaceholderMobile');
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="search"
      accessibilityLabel={label}
      style={styles.field}
    >
      <Icon name="magnifying-glass" size={iconSize.md} color={colors.text.muted} />
      <Text
        variant="body"
        tone="muted"
        numberOfLines={1}
        maxFontSizeMultiplier={theme.typography.maxFontScale.control}
        style={styles.placeholder}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  field: {
    // Yükseklik = cam ikon düğmesi çapı (tek sabit; satırda düğmelerle aynı boy); tam yuvarlak hap.
    // `flex: 1` YOK: sarmalayıcı yüksekliği içerikten gelir, satır dikey ortalar.
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: GLASS_ICON_BUTTON_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    flex: 1,
  },
});
