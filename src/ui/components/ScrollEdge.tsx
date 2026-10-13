import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';
import { scrollEdgeOpacity } from '../lib/pageScroll';

const { colors, spacing } = theme;

/** Çubuğun altına taşan yumuşak geçiş boyu (pt): içerik bar altına girerken beyaza solar. */
export const SCROLL_EDGE_FADE = spacing[4];

export interface ScrollEdgeProps {
  /** Üst bar yüksekliği: güvenli alan üstü + `headerHeight` (durum çubuğu bölgesini de kapsar). */
  barHeight: number;
  /**
   * Kaydırma sinyali (0 = içerik başı). Verilmezse efekt SABİT hafif beyaz şerit olur: kaydırma
   * sinyali bağlanmamış ekranlarda bar her zaman okunur kalır.
   */
  scrollY?: SharedValue<number>;
  testID?: string;
}

/**
 * Yüzen üst barın kaydırma kenarı: yukarıdan aşağı solan yarı saydam beyaz (surface tonu), durum
 * çubuğu + bar bölgesini kaplar. Opaklık kaydırma ofsetine bağlı (`scrollEdgeOpacity`: 0'da yok,
 * 24pt'de tam). iOS 26'da da gradyan: native cam, ata `opacity < 1` iken efektini kaybettiği için
 * animasyonlu şeritte kullanılamaz. Dokunuşları geçirir (`pointerEvents="none"`).
 */
export const ScrollEdge: React.FC<ScrollEdgeProps> = ({ barHeight, scrollY, testID = 'scroll-edge' }) =>
  scrollY ? (
    <AnimatedEdge barHeight={barHeight} scrollY={scrollY} testID={testID} />
  ) : (
    <View
      pointerEvents="none"
      testID={testID}
      style={[styles.fill, { height: barHeight, backgroundColor: colors.overlay.white95 }]}
    />
  );

const AnimatedEdge: React.FC<Required<Pick<ScrollEdgeProps, 'scrollY'>> & Omit<ScrollEdgeProps, 'scrollY'>> = ({
  barHeight,
  scrollY,
  testID,
}) => {
  const style = useAnimatedStyle(() => ({ opacity: scrollEdgeOpacity(scrollY.value) }));
  const total = barHeight + SCROLL_EDGE_FADE;
  return (
    <Animated.View pointerEvents="none" testID={testID} style={[styles.fill, { height: total }, style]}>
      <LinearGradient
        colors={[colors.overlay.white95, colors.overlay.white90, colors.overlay.white0]}
        locations={[0, barHeight / total, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0 },
});
