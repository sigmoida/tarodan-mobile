import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RawText, theme } from '@/ui';

const { colors, spacing, typography, radiusRole } = theme;

/**
 * Stoğu biten ürün kartlarında görselin üstünde gösterilen "Stokta yok" katmanı (web
 * `OutOfStockOverlay`: heading/70 zemin, 2xs extrabold, rounded). Görseli soluklaştırmak çağıran
 * tarafın sorumluluğundadır (ör. image style'a opacity). Kapsayan View konumlandırma bağlamı olur.
 */
export function OutOfStockOverlay({ label = 'STOKTA YOK' }: { label?: string }) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <RawText style={styles.text}>{label}</RawText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    backgroundColor: colors.overlay.black70,
    color: colors.text.inverted,
    fontSize: typography.fontSize['2xs'],
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radiusRole.productCard,
    overflow: 'hidden',
  },
});
