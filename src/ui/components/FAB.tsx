import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, type PressableProps, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import {
  FAB_SIZE_SM,
  FLOATING_ACTION_ICON_SIZE,
  FLOATING_ACTION_SIZE,
  FLOATING_SIDE_GAP,
  useFloatingBottomOffset,
} from '../lib/floating';
import { RawText } from './Text';
import { tabletSidePadding } from '../lib/windowClass';
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
   * `bottomRight`: ekranın sağ altında yüzer — alt menü hapının yüksekliğinde, aynı sağ kenar ve alt
   * uzaklıkta (`FLOATING_ACTION_SIZE` / `FLOATING_SIDE_GAP` / `floatingBottomOffset`: iOS/hareket
   * gezinmesinde tutamaç şeridine biner, Android 3 düğmeli çubuğun üstünde). `size` verilmezse
   * çap `FLOATING_ACTION_SIZE` (birincil "oluştur" FAB'ı); ikincil FAB `size` vererek küçük kalır,
   * konumu yine aynıdır. Ekranın kaydırma içeriği `useFabContentInset()` kadar alt boşluk bırakır.
   */
  placement?: 'bottomRight';
}

const { colors, radius, spacing } = theme;

const sizeMap: Record<FABSize, { box: number; icon: number }> = {
  sm: { box: FAB_SIZE_SM, icon: 18 },
  md: { box: 56, icon: 24 },
  lg: { box: 64, icon: 28 },
};

/** Sağ alt yerleşimin ölçüsü (tek kaynak `lib/floating`). */
const FLOATING_SIZE = { box: FLOATING_ACTION_SIZE, icon: FLOATING_ACTION_ICON_SIZE };

const variantStyle: Record<FABVariant, { bg: string; fg: string }> = {
  primary: { bg: colors.primary[600]!, fg: colors.white },
  secondary: { bg: colors.surface.elevated, fg: colors.primary[600]! },
};

export const FAB: React.FC<FABProps> = ({
  icon,
  iconVariant,
  label,
  variant = 'primary',
  size,
  disabled,
  style,
  accessibilityLabel,
  placement,
  ...rest
}) => {
  const floatingBottom = useFloatingBottomOffset();
  // Large screens: the right edge follows the tablet page gutter (phones: the side gap).
  const sideGap = tabletSidePadding(FLOATING_SIDE_GAP, useWindowDimensions().width);
  const floating = placement === 'bottomRight';
  // Sağ altta boyut verilmezse `FLOATING_ACTION_SIZE`; verilirse (ikincil FAB) o boyut.
  const ss = size ? sizeMap[size] : floating ? FLOATING_SIZE : sizeMap.md;
  const vs = variantStyle[variant];
  const extended = !!label;
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        floating && {
          position: 'absolute',
          right: sideGap,
          bottom: floatingBottom,
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
