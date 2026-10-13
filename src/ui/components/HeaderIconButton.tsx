import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../lib/theme';
import { CountBadge } from './CountBadge';
import { RefIcon, type IconRef, type IconVariant } from '../icons';

export type HeaderIconTone = 'primary' | 'onSurface';

export interface HeaderIconButtonProps {
  /** Heroicons adı (geçiş: eski Ionicons adları da çözülür). */
  icon: IconRef;
  iconVariant?: IconVariant;
  /** Ekran okuyucu etiketi — zorunlu (ikon tek başına anlam taşımaz). */
  label: string;
  onPress: () => void;
  /** İkonun sağ üstünde sayaç rozeti (danger-500, 99+). 0 çizilmez. */
  count?: number;
  /** `primary`: beyaz bar üstünde primary-600 ikon (tab kökü AppShell); `onSurface`: beyaz bar üstünde başlık renginde. */
  tone?: HeaderIconTone;
  disabled?: boolean;
  testID?: string;
}

const { colors, iconSize, minTouchTarget, spacing } = theme;

/** Basılı geri bildirim: iOS'ta soluklaşma (zemin yok), Android'de borderless ripple. */
const PRESSED_OPACITY = 0.6;

/**
 * Üst bar ikon düğmesi — TEK kaynak (AppShell ve TopBarAction bunu kullanır). Zeminsiz; gerçek
 * 44pt dokunma kutusu, ikon 24. Rozet ikonun sağ üstüne sabit ofsetle oturur.
 */
export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  icon,
  iconVariant,
  label,
  onPress,
  count,
  tone = 'onSurface',
  disabled,
  testID,
}) => {
  const iconColor = tone === 'primary' ? colors.primary[600] : colors.text.heading;
  // Her iki ton da beyaz barda: rozet halkası bar zemini (beyaz) → rozet net ayrışır.
  const ringColor = colors.surface.elevated;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{
        borderless: true,
        radius: minTouchTarget / 2,
        color: colors.overlay.black10,
      }}
      style={({ pressed }) => [
        styles.box,
        Platform.OS === 'ios' && pressed && styles.pressedIos,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.iconWrap}>
        <RefIcon icon={icon} variant={iconVariant} size={iconSize.lg} color={iconColor} />
        <CountBadge count={count ?? 0} ringColor={ringColor} style={styles.badge} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  box: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: iconSize.lg,
    height: iconSize.lg,
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2],
  },
  pressedIos: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: 0.5,
  },
});
