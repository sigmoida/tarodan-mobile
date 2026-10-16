import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef, type IconVariant } from '../icons';
import { getGlassView } from '../lib/glass';
import { usePressScale } from '../lib/pressScale';
import { CountBadge } from './CountBadge';
import { GlassSurface } from './GlassSurface';

const { colors, iconSize, minTouchTarget, controlHeight } = theme;

/** Daire çapı: dokunma alanı (44pt) görsel ölçüyle aynı — ek hitSlop gerekmez. */
export const GLASS_ICON_BUTTON_SIZE = minTouchTarget;

/** Küçük varyantın görsel çapı (ürün kartı görselindeki favori kalbi); dokunma alanı hitSlop ile 44pt. */
export const GLASS_ICON_BUTTON_SIZE_SM = controlHeight.sm;

export type GlassIconTone = 'heading' | 'muted';

/** `md` (varsayılan): 44pt daire, 24 ikon. `sm`: 32pt daire, 20 ikon, hitSlop ile 44pt dokunma alanı. */
export type GlassIconButtonSize = 'md' | 'sm';

const SIZES: Record<GlassIconButtonSize, { box: number; icon: number }> = {
  md: { box: GLASS_ICON_BUTTON_SIZE, icon: iconSize.lg },
  sm: { box: GLASS_ICON_BUTTON_SIZE_SM, icon: iconSize.md },
};

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
  /** Görsel ölçü; dokunma alanı her ölçüde ≥ 44pt. */
  size?: GlassIconButtonSize;
  /** Aç/kapa düğmelerinde (favori) durum: etiket sabit kalır, ekran okuyucu "seçili" der. */
  selected?: boolean;
}

/**
 * Cam daire ikon düğmesi (geri, paylaş, favori, sepet, ☰) — TEK kaynak. Dokunma kutusu 44pt, ikon
 * 24 (`size="sm"`: 32pt daire / 20 ikon, dokunma alanı hitSlop ile yine 44pt), yüzey `GlassSurface`
 * (iOS 26 Liquid Glass / yarı saydam beyaz / Android beyaz + ripple).
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
  size = 'md',
  selected,
}: GlassIconButtonProps) {
  // Native cam, ata opacity < 1 iken efektini kaybeder: camda soluklaştırma ve basılı geri bildirimi
  // (disabled opacity / pressed opacity) yüzeye değil içeriğe / ölçeğe uygulanır.
  const glass = getGlassView() !== null;
  const press = usePressScale(disabled);
  const color = iconColor ?? (tone === 'muted' ? theme.inactiveIconColor : colors.text.heading);
  const { box, icon: glyph } = SIZES[size];
  const boxStyle = size === 'md' ? styles.box : styles.boxSm;
  // Küçük daire: görsel çap dışında kalan payı dokunma alanına ekle (44pt kuralı).
  const slop = (minTouchTarget - box) / 2;
  return (
    <Animated.View style={[boxStyle, press.style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={selected === undefined ? { disabled: !!disabled } : { disabled: !!disabled, selected }}
        hitSlop={slop > 0 ? slop : undefined}
        android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10, radius: box / 2, foreground: true } : undefined}
        style={({ pressed }) => [
          boxStyle,
          disabled && !glass && styles.disabled,
          // Camda opacity YOK (efekti bozar): geri bildirim native interaktif cam + ölçek. Fallback: opacity.
          pressed && Platform.OS === 'ios' && !glass && styles.pressed,
        ]}
      >
        {/* Camda native interaktif efekt dokunuşu cam görünümden ister: pointerEvents none yalnız fallback'te. */}
        <GlassSurface
          shape="circle"
          size={box}
          interactive={!disabled}
          pointerEvents={glass ? undefined : 'none'}
        >
          <View style={disabled && glass ? styles.disabled : undefined}>
            <RefIcon icon={icon} variant={iconVariant} size={glyph} color={color} />
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
  boxSm: {
    width: GLASS_ICON_BUTTON_SIZE_SM,
    height: GLASS_ICON_BUTTON_SIZE_SM,
    borderRadius: GLASS_ICON_BUTTON_SIZE_SM / 2,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
