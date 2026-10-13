import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { getGlassView } from '../lib/glass';

const { colors, shadow } = theme;

export type GlassShape = 'circle' | 'pill';

export interface GlassSurfaceProps extends Omit<ViewProps, 'style'> {
  /**
   * `circle`: `size` x `size` daire. `pill`: yüksekliği `size`, genişliği kapsayıcıdan/`style`'dan
   * (flex) gelen hap.
   */
  shape?: GlassShape;
  /** Daire çapı ya da hap yüksekliği (pt). */
  size: number;
  /** Köşe yarıçapı; verilmezse `size / 2` (tam yuvarlak). Native cam sonsuz yarıçapı sevmez: sayı. */
  radius?: number;
  /**
   * Vurgu rengi (ör. "+" düğmesinin turuncusu). iOS 26: camın `tintColor`'ı + okunaklılık için
   * `TINT_FILL_OPACITY` kadar dolgu. Fallback: düz bu renk.
   */
  tint?: string;
  /**
   * Fallback yüzey opak beyaz + 1px kenarlık + `shadow.medium` olsun (alt menü hapı). Varsayılan:
   * iOS < 26'da yarı saydam beyaz + ince kenarlık + `shadow.soft`; Android'de beyaz + `shadow.medium`.
   */
  opaque?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Cam üstündeki `tint` dolgusunun opaklığı: cam kenar/yansıması görünür, beyaz ikon yine okunur. */
export const TINT_FILL_OPACITY = 0.82;

/**
 * Ortak "cam" yüzey — TEK kaynak (ürün detayı adaları, alt menü, ana sayfa üst barı).
 * - iOS 26+: gerçek Liquid Glass (`GlassView`, arkadaki içerik görünür; kendi gölgesi/kenarı var).
 * - iOS < 26 ya da modül yok (eski binary / Expo Go): yarı saydam beyaz + hairline kenarlık + gölge.
 * - Android: beyaz yüzey + elevation (blur yok).
 * ÖNEMLİ: native cam, ata `opacity < 1` iken efektini kaybeder. Bu yüzeyin kendisine ya da bir
 * atasına animasyonlu opacity VERME; gizlemek için transform (translate/scale) kullan, içeriği
 * (çocukları) ayrıca soluklaştır.
 */
export function GlassSurface({
  shape = 'circle',
  size,
  radius,
  tint,
  opaque,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const Glass = getGlassView();
  const r = radius ?? size / 2;
  const box: ViewStyle = { height: size, borderRadius: r, ...(shape === 'circle' ? { width: size } : null) };

  if (Glass) {
    return (
      <Glass
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor={tint}
        style={[box, styles.glass, style]}
        {...rest}
      >
        {tint ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: TINT_FILL_OPACITY, borderRadius: r }]}
          />
        ) : null}
        {children}
      </Glass>
    );
  }

  const surface = tint
    ? { backgroundColor: tint, ...shadow.medium }
    : opaque
      ? styles.opaque
      : Platform.OS === 'android'
        ? styles.android
        : styles.ios;
  return (
    <View style={[box, styles.center, surface, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ios: {
    backgroundColor: colors.overlay.white90,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    ...shadow.soft,
  },
  android: { backgroundColor: colors.surface.elevated, ...shadow.medium },
  opaque: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadow.medium,
  },
});
