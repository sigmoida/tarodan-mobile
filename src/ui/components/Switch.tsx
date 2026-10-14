import React from 'react';
import {
  Platform,
  Switch as RNSwitch,
  type Insets,
  type SwitchProps as RNSwitchProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';

export type SwitchSize = 'sm' | 'md';

export interface SwitchProps
  extends Omit<RNSwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'> {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /**
   * `sm` (varsayılan) = web Switch boyu (`h-6 w-11` ≈ 44×24): iOS'un yerel 51×31 anahtarı 0.8
   * ölçekle ~41×25'e iner. `md` = platformun yerel boyu (iri; yalnız gerçekten gerekirse).
   * Android'in Material anahtarı zaten kompakt — ölçeklenmez.
   */
  size?: SwitchSize;
}

const { colors } = theme;

/** iOS UISwitch'in sabit yerel boyu (pt) — ölçek sonrası yerleşim kutusunu görsele eşitlemek için. */
const IOS_NATIVE = { width: 51, height: 31 } as const;
const SM_SCALE = 0.8;

/**
 * `transform: scale` görseli küçültür ama yerleşim kutusunu küçültmez; negatif kenar boşluğu kutuyu
 * görsel boya çeker (sağa yaslı anahtar hizası korunur). Dokunma alanı da ölçekle küçüldüğü için
 * `hitSlop` 44pt hedefi tamamlar (hitSlop yerel koordinatta, ölçekle çarpılır: 12×0.8×2 + 25 ≈ 44).
 */
const SM_IOS_STYLE: ViewStyle = {
  transform: [{ scale: SM_SCALE }],
  marginHorizontal: -((IOS_NATIVE.width * (1 - SM_SCALE)) / 2),
  marginVertical: -((IOS_NATIVE.height * (1 - SM_SCALE)) / 2),
};
const SM_HIT_SLOP: Insets = { top: 12, bottom: 12, left: 6, right: 6 };

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  size = 'sm',
  style,
  hitSlop,
  ...rest
}) => {
  const compact = size === 'sm' && Platform.OS === 'ios';
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.gray[300], true: colors.primary[600]! }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.gray[300]}
      hitSlop={hitSlop ?? (compact ? SM_HIT_SLOP : undefined)}
      style={compact ? [SM_IOS_STYLE, style] : style}
      {...rest}
    />
  );
};
