import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { RefIcon, type IconRef, type IconVariant } from '../icons';

export type FABVariant = 'primary' | 'secondary';
export type FABSize = 'sm' | 'md' | 'lg';

export interface FABProps extends Omit<PressableProps, 'style'> {
  icon: IconRef;
  iconVariant?: IconVariant;
  label?: string;
  variant?: FABVariant;
  size?: FABSize;
  style?: ViewStyle;
  accessibilityLabel: string;
  /**
   * `bottomRight`: ekranın sağ altında yüzer — alt güvenli alanın (iOS ana ekran çubuğu, Android
   * 3 düğmeli / hareket gezinme çubuğu) ÜSTÜNDE. Ekranlar kendi `bottom` değerini yazmaz.
   */
  placement?: 'bottomRight';
}

const { colors, radius, spacing } = theme;

const sizeMap: Record<FABSize, { box: number; icon: number }> = {
  sm: { box: 40, icon: 18 },
  md: { box: 56, icon: 24 },
  lg: { box: 64, icon: 28 },
};

const variantStyle: Record<FABVariant, { bg: string; fg: string }> = {
  primary: { bg: colors.primary[600]!, fg: colors.white },
  secondary: { bg: colors.surface.elevated, fg: colors.primary[600]! },
};

export const FAB: React.FC<FABProps> = ({
  icon,
  iconVariant,
  label,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  accessibilityLabel,
  placement,
  ...rest
}) => {
  const insets = useSafeAreaInsets();
  const ss = sizeMap[size];
  const vs = variantStyle[variant];
  const extended = !!label;
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        placement === 'bottomRight' && {
          position: 'absolute',
          right: spacing[4],
          bottom: insets.bottom + spacing[4],
        },
        {
          height: ss.box,
          minWidth: ss.box,
          paddingHorizontal: extended ? spacing[5] : 0,
          backgroundColor: vs.bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      <RefIcon icon={icon} variant={iconVariant} size={ss.icon} color={vs.fg} />
      {extended && (
        <RawText
          style={{
            color: vs.fg,
            fontWeight: '600',
            marginLeft: spacing[2],
          }}
        >
          {label}
        </RawText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
