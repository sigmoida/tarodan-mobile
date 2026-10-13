import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../lib/theme';
import { ICON_PATHS, type IconPathData } from './icon-paths.generated';

/** Web `@tarodan/ui` ile aynı ikon seti: Heroicons v2 (24px, MIT). Ad = kebab-case (`HeartIcon` -> `heart`). */
export type IconName = keyof typeof ICON_PATHS;
export type IconVariant = 'outline' | 'solid';

export interface IconProps {
  name: IconName;
  /** Web: ana ikonlar `outline`; dolu durum (favori, puan) için `solid`. */
  variant?: IconVariant;
  /** pt. Token: `theme.iconSize.sm|md|lg` (16/20/24). Varsayılan `md`. */
  size?: number;
  color?: string;
  /** Yalnız outline: Heroicons 24/outline çizgi kalınlığı (varsayılan 1.5, web ile aynı). */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Verilirse ikon erişilebilir görüntü olur; verilmezse süs (ekran okuyucu atlar). */
  accessibilityLabel?: string;
}

/** Çalışma anında ad geçerli mi (dinamik/sunucu kaynaklı adlar için). */
export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_PATHS, name);
}

const d = (p: IconPathData): string => (typeof p === 'string' ? p : p[0]);
const evenOdd = (p: IconPathData): boolean => typeof p !== 'string';

export const Icon: React.FC<IconProps> = ({
  name,
  variant = 'outline',
  size = theme.iconSize.md,
  color = theme.colors.text.body,
  strokeWidth = 1.5,
  style,
  testID,
  accessibilityLabel,
}) => {
  // Sunucu/dinamik kaynaklı bilinmeyen ad çökertmez: hiçbir şey çizilmez (dev'de uyarı).
  const def = isIconName(name) ? ICON_PATHS[name] : undefined;
  if (!def) {
    // Sabit metin: konsol sızıntı taraması değişkenli console.* çağrısına izin vermez.
    if (__DEV__) console.warn('[Icon] bilinmeyen ikon adı (testID/çağıran yerden bulun)');
    return null;
  }
  const paths = def[variant] ?? def.outline;
  const solid = variant === 'solid';
  const a11y = accessibilityLabel
    ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel } as const)
    : ({ accessible: false } as const);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? color : 'none'}
      stroke={solid ? undefined : color}
      strokeWidth={solid ? undefined : strokeWidth}
      strokeLinecap={solid ? undefined : 'round'}
      strokeLinejoin={solid ? undefined : 'round'}
      style={style}
      testID={testID ?? `icon-${name}`}
      {...a11y}
    >
      {paths.map((p, i) => (
        <Path key={i} d={d(p)} fillRule={evenOdd(p) ? 'evenodd' : undefined} clipRule={evenOdd(p) ? 'evenodd' : undefined} />
      ))}
    </Svg>
  );
};
