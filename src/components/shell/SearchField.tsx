import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon, GLASS_ICON_BUTTON_SIZE, searchFieldBoxStyle } from '@/ui';

const { colors, spacing, iconSize } = theme;

export interface SearchFieldProps {
  onPress: () => void;
  /** Boşken gösterilen metin; verilmezse web'in telefon başlığındaki kısa metin `nav.searchPlaceholderMobile` (dar alanda kesilmez). */
  placeholder?: string;
  testID?: string;
}

/**
 * Üst bardaki arama alanı — dokununca arama ekranını açan SAHTE alan (düzenlenemez). Arama,
 * öneri ve son aramalar tek yerde (arama ekranı) yaşar; tab kökleri yalnız oraya götürür. Görünüm
 * arama ekranının kutusuyla AYNI kaynaktan (`searchFieldBoxStyle`: beyaz zemin, 1px primary-500
 * çerçeve, `radiusRole.input`).
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
    // Zemin/çerçeve/radius arama ekranıyla tek kaynaktan; yükseklik = cam ikon düğmesi çapı (satırda
    // düğmelerle aynı boy). `flex: 1` YOK: sarmalayıcı yüksekliği içerikten gelir, satır dikey ortalar.
    ...searchFieldBoxStyle(),
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: GLASS_ICON_BUTTON_SIZE,
    gap: spacing[2],
  },
  placeholder: {
    flex: 1,
  },
});
