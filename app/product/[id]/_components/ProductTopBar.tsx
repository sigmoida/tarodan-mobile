import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, useHeaderTopInset } from '@/ui';
import { FLOATING_BUTTON_SIZE, FloatingIconButton } from './FloatingIconButton';
import { GALLERY_SIZE } from '../_lib/layout';

const { colors, spacing } = theme;

/** Kaydırma eşiğinden bu kadar pt içinde zemin tamamen belirir (yumuşak geçiş). */
const FADE_DISTANCE = spacing[6];

/**
 * Ürün detayının üst katmanı: galerinin üstünde yüzen adalar — solda geri, sağda `children`
 * (şikayet, paylaş, favori, sepet). Adalar durum çubuğu / Dynamic Island'ın altından başlar
 * (`useHeaderTopInset`). Galeri kaydırılıp bittiğinde adaların arkasında beyaz bir üst bar belirir ki
 * içerik saatle / adalarla çakışmasın. `solid`: galeri yokken (yükleniyor / bulunamadı) hep görünür.
 */
export function ProductTopBar({
  scrollY,
  solid,
  onBack,
  children,
}: {
  scrollY: Animated.Value;
  solid: boolean;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const topInset = useHeaderTopInset();
  // Beliren beyaz bar diğer tüm ekranlarla AYNI yükseklikte (inset + headerHeight); adalar bu
  // satırda dikey ortalı.
  const rowTop = topInset + (theme.headerHeight - FLOATING_BUTTON_SIZE) / 2;
  const barHeight = topInset + theme.headerHeight;
  const revealAt = GALLERY_SIZE - barHeight;
  const opacity = solid
    ? 1
    : scrollY.interpolate({
        inputRange: [revealAt - FADE_DISTANCE, revealAt],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        testID="product-top-bar-background"
        pointerEvents="none"
        style={[styles.background, { height: barHeight, opacity }]}
      />
      <View style={[styles.row, { paddingTop: rowTop }]} pointerEvents="box-none">
        <FloatingIconButton
          testID="product-back-button"
          icon="chevron-back"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
        />
        <View style={styles.right}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0 },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
