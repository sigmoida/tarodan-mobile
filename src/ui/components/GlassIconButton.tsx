import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef, type IconVariant } from '../icons';
import { getGlassView } from '../lib/glass';
import { usePressScale } from '../lib/pressScale';
import { CountBadge } from './CountBadge';
import { GlassSurface } from './GlassSurface';

const { colors, iconSize, minTouchTarget } = theme;

/** Daire çapı: dokunma alanı (44pt) görsel ölçüyle aynı — ek hitSlop gerekmez. */
export const GLASS_ICON_BUTTON_SIZE = minTouchTarget;

export type GlassIconTone = 'heading' | 'muted';

export interface GlassIconButtonProps {
  /** Heroicons adı (geçiş: eski Ionicons adları da çözülür). */
  icon: IconRef;
  iconVariant?: IconVariant;
  onPress: () => void;
  /** Ekran okuyucu etiketi — zorunlu (ikon tek başına anlam taşımaz). */
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
  /** Sepet gibi sayaçlı ikonlarda sağ üst rozet. */
  count?: number;
  /** `heading` (varsayılan): başlık rengi; `muted`: alt menü pasif ikon grisi. */
  tone?: GlassIconTone;
  /** Dolu favori gibi durumlarda ton yerine bu renk. */
  iconColor?: string;
}

/**
 * Cam daire ikon düğmesi (geri, paylaş, favori, sepet, ☰) — TEK kaynak. Dokunma kutusu 44pt, ikon
 * 24, yüzey `GlassSurface` (iOS 26 Liquid Glass / yarı saydam beyaz / Android beyaz + ripple).
 */
export function GlassIconButton({
  icon,
  iconVariant,
  onPress,
  accessibilityLabel,
  testID,
  disabled,
  count,
  tone = 'heading',
  iconColor,
}: GlassIconButtonProps) {
  // Native cam, ata opacity < 1 iken efektini kaybeder: camda soluklaştırma ve basılı geri bildirimi
  // (disabled opacity / pressed opacity) yüzeye değil içeriğe / ölçeğe uygulanır.
  const glass = getGlassView() !== null;
  const press = usePressScale(disabled);
  const color = iconColor ?? (tone === 'muted' ? theme.inactiveIconColor : colors.text.heading);
  return (
    <Animated.View style={[styles.box, press.style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10, radius: GLASS_ICON_BUTTON_SIZE / 2, foreground: true } : undefined}
        style={({ pressed }) => [
          styles.box,
          disabled && !glass && styles.disabled,
          // Camda opacity YOK (efekti bozar): geri bildirim native interaktif cam + ölçek. Fallback: opacity.
          pressed && Platform.OS === 'ios' && !glass && styles.pressed,
        ]}
      >
        {/* Camda native interaktif efekt dokunuşu cam görünümden ister: pointerEvents none yalnız fallback'te. */}
        <GlassSurface
          shape="circle"
          size={GLASS_ICON_BUTTON_SIZE}
          interactive={!disabled}
          pointerEvents={glass ? undefined : 'none'}
        >
          <View style={disabled && glass ? styles.disabled : undefined}>
            <RefIcon icon={icon} variant={iconVariant} size={iconSize.lg} color={color} />
          </View>
        </GlassSurface>
        {count ? <CountBadge count={count} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: GLASS_ICON_BUTTON_SIZE,
    height: GLASS_ICON_BUTTON_SIZE,
    borderRadius: GLASS_ICON_BUTTON_SIZE / 2,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
