import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, Text, androidRipple, rippleClip, theme } from '@/ui';
import { pressedStyle } from '../_lib/press';

const { colors, spacing, radiusRole } = theme;

interface ParentCrumbProps {
  /** Üst düzeyin adı (üst kategori; yoksa grup adı). */
  parentTitle: string;
  onPress: () => void;
}

/**
 * Alt kategori düzeyinde başlığın üstündeki kırıntı: "‹ <Üst kategori adı>". Ekran geri okundan
 * (PageShell, ekranı kapatır) ayrıdır: bu yalnız bir üst düzeye döner; erişilebilirlik etiketi bunu
 * açıkça söyler ("Üst kategoriye dön: …").
 */
export function ParentCrumb({ parentTitle, onPress }: ParentCrumbProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      testID="categories-parent-crumb"
      accessibilityRole="button"
      accessibilityLabel={t('nav.backToParentCategory', { name: parentTitle })}
      onPress={onPress}
      android_ripple={androidRipple()}
      style={({ pressed }) => [styles.crumb, rippleClip(), pressedStyle(pressed)]}
    >
      <Icon name="chevron-left" size={theme.iconSize.sm} color={colors.text.muted} />
      <Text variant="bodySm" weight="medium" tone="muted" numberOfLines={1} style={styles.label}>
        {parentTitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    minHeight: theme.minTouchTarget,
    paddingRight: spacing[2],
    borderRadius: radiusRole.button,
  },
  label: { flexShrink: 1 },
});
