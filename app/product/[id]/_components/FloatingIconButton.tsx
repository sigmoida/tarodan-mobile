import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountBadge, theme } from '@/ui';
import { getGlassView } from '../_lib/glass';

const { colors, radius, shadow, iconSize, minTouchTarget } = theme;

/** Ada çapı: dokunma alanı (44pt) görsel ölçüyle aynı — ek hitSlop gerekmez. */
export const FLOATING_BUTTON_SIZE = minTouchTarget;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FloatingIconButtonProps {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
  /** Sepet gibi sayaçlı ikonlarda sağ üst rozet. */
  count?: number;
  /** Varsayılan başlık rengi; dolu favori gibi durumlarda değişir. */
  iconColor?: string;
}

/**
 * Galeri üstünde yüzen yuvarlak "ada" butonu (geri, şikayet, paylaş, favori, sepet) — tek kaynak.
 * iOS 26: Liquid Glass (`GlassView`). iOS < 26 (ya da modül yok): yarı saydam beyaz + ince kenarlık +
 * `shadow.soft`. Android: Material — beyaz yüzey daire + elevation + ripple; blur YOK.
 */
export function FloatingIconButton({
  icon,
  onPress,
  accessibilityLabel,
  testID,
  disabled,
  count,
  iconColor = colors.text.heading,
}: FloatingIconButtonProps) {
  const Glass = getGlassView();
  const glyph = <Ionicons name={icon} size={iconSize.lg} color={iconColor} />;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={Platform.OS === 'android' ? { color: theme.colors.overlay.black10 } : undefined}
      style={({ pressed }) => [
        styles.circle,
        !Glass && (Platform.OS === 'android' ? styles.androidSurface : styles.iosSurface),
        disabled && styles.disabled,
        pressed && Platform.OS === 'ios' && styles.pressed,
      ]}
    >
      {Glass ? (
        <Glass glassEffectStyle="regular" colorScheme="light" style={[styles.circle, styles.glass]}>
          {glyph}
        </Glass>
      ) : (
        <View pointerEvents="none">{glyph}</View>
      )}
      {count ? <CountBadge count={count} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: { overflow: 'hidden' },
  iosSurface: {
    backgroundColor: theme.colors.overlay.white90,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    ...shadow.soft,
  },
  androidSurface: { backgroundColor: colors.surface.elevated, ...shadow.medium },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
