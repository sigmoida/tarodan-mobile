import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassSurface, Text, theme, Icon, GLASS_ICON_BUTTON_SIZE, getGlassView } from '@/ui';

const { colors, spacing, iconSize } = theme;

export interface SearchFieldProps {
  onPress: () => void;
  /** Boşken gösterilen metin; verilmezse web'in telefon başlığındaki kısa metin `nav.searchPlaceholderMobile` (dar alanda kesilmez). */
  placeholder?: string;
  /** İçeriğin (ikon + metin) ek stili — camda gizlenirken içerik yüzeyin İÇİNDE solar (animasyonlu). */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Üst bardaki arama alanı — dokununca arama ekranını açan SAHTE alan (düzenlenemez). Arama,
 * öneri ve son aramalar tek yerde (arama ekranı) yaşar; tab kökleri yalnız oraya götürür. Görünüm:
 * yanındaki cam düğmelerle (`GlassIconButton`) AYNI yüzey — `GlassSurface` hap (iOS 26 Liquid Glass,
 * iOS < 26 yarı saydam beyaz, Android beyaz), yükseklik = cam düğme çapı. Arama ekranının vurgulu
 * (primary çerçeveli) kutusundan bilinçli olarak farklı; üst barda sakin durur.
 */
export const SearchField: React.FC<SearchFieldProps> = ({ onPress, placeholder, contentStyle, testID }) => {
  const { t } = useTranslation();
  const label = placeholder ?? t('nav.searchPlaceholderMobile');
  const glass = getGlassView() !== null;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="search"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.field, pressed && !glass && styles.pressed]}
    >
      {/* Camda native interaktif efekt dokunuşu cam görünümden ister: pointerEvents none yalnız fallback'te. */}
      <GlassSurface
        shape="pill"
        size={GLASS_ICON_BUTTON_SIZE}
        interactive
        pointerEvents={glass ? undefined : 'none'}
        style={styles.surface}
        testID={testID ? `${testID}-surface` : undefined}
      >
        <Animated.View style={[styles.content, contentStyle]}>
          {/* Yanındaki cam düğmelerle aynı renk (GlassIconButton `heading`): ikon + metin; arama
              ekranının üst bardaki kutusuyla da aynı. */}
          <Icon name="magnifying-glass" size={iconSize.md} color={colors.text.heading} />
          <Text
            variant="body"
            tone="heading"
            numberOfLines={1}
            maxFontSizeMultiplier={theme.typography.maxFontScale.control}
            style={styles.placeholder}
          >
            {label}
          </Text>
        </Animated.View>
      </GlassSurface>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Yükseklik = cam ikon düğmesi çapı (tek sabit; satırda düğmelerle aynı boy). `flex: 1` YOK:
  // sarmalayıcı yüksekliği içerikten gelir, satır dikey ortalar.
  field: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
  surface: {
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
  placeholder: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
