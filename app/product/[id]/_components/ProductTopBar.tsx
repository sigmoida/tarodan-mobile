import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SCROLL_EDGE_FULL_AT, ScrollEdge, theme, useHeaderTopInset } from '@/ui';
import { FloatingIconButton } from './FloatingIconButton';
import { useGallerySize } from '../_lib/layout';

const { spacing, headerHeight, headerBottomPad } = theme;

/**
 * Ürün detayının üst barı: galerinin üstünde yüzen adalar — solda geri, sağda `children` (⋮ menü,
 * paylaş, favori). Ölçüler diğer tüm üst barlarla AYNI (`ScreenHeader`): güvenli alan üstü +
 * `headerHeight` satırı + `headerBottomPad`, 12pt yan boşluk, satırda dikey ortalı 44pt cam daireler.
 * Arkada aynı kaydırma kenarı (`ScrollEdge`); tek fark tetik noktası: galeri bar ALTINA kadar
 * uzandığından kenar 0'da değil, galerinin sonu bara geldiğinde tamamlanır (görsel beyaza boğulmaz).
 * Yükleniyor / bulunamadı: içerik bar altına girmez, kenar dinlenmede (görünmez).
 */
export function ProductTopBar({
  scrollY,
  onBack,
  children,
}: {
  scrollY: SharedValue<number>;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const topInset = useHeaderTopInset();
  const barHeight = topInset + headerHeight + headerBottomPad;
  const gallerySize = useGallerySize();
  // Kenar, galerinin altı barın altına ulaştığında TAM opak: kaydırma ofsetini o noktaya kaydır.
  const fullAt = gallerySize - barHeight;
  const edgeY = useDerivedValue(() => scrollY.value - (fullAt - SCROLL_EDGE_FULL_AT));

  return (
    <View style={[styles.root, { paddingTop: topInset }]} pointerEvents="box-none">
      <ScrollEdge barHeight={barHeight} scrollY={edgeY} testID="product-top-bar-edge" />
      <View style={styles.row} pointerEvents="box-none">
        <FloatingIconButton
          testID="product-back-button"
          icon="chevron-left"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
        />
        <View style={styles.right}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[3],
    paddingBottom: headerBottomPad,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: headerHeight,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
