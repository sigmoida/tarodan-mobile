import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { useBrandTextStyle, withTextInherit } from '../lib/font';

export type TextVariant =
  | 'displayLg'
  | 'displaySm'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'label'
  | 'overline';

export type TextTone =
  | 'heading'
  | 'body'
  | 'muted'
  | 'subtle'
  | 'inverted'
  | 'primary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Override final color. Avoid where possible — prefer `tone`. */
  color?: string;
}

const { colors, typography } = theme;

const variantStyle: Record<TextVariant, TextStyle> = {
  displayLg: {
    fontSize: typography.fontSize['4xl'],
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
    fontWeight: '700',
  },
  displaySm: {
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
    fontWeight: '700',
  },
  h1: {
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
    fontWeight: '700',
  },
  h2: {
    fontSize: typography.fontSize.xl,
    lineHeight: typography.fontSize.xl * typography.lineHeight.snug,
    fontWeight: '700',
  },
  h3: {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.snug,
    fontWeight: '600',
  },
  body: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    fontWeight: '400',
  },
  bodySm: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    fontWeight: '400',
  },
  caption: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    fontWeight: '400',
  },
  label: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.snug,
    fontWeight: '600',
  },
  overline: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.snug,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

const variantDefaultTone: Record<TextVariant, TextTone> = {
  displayLg: 'heading',
  displaySm: 'heading',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  body: 'body',
  bodySm: 'body',
  caption: 'muted',
  label: 'heading',
  overline: 'muted',
};

const toneColor = (tone: TextTone): string => {
  switch (tone) {
    case 'heading':
      return colors.text.heading;
    case 'body':
      return colors.text.body;
    case 'muted':
      return colors.text.muted;
    case 'subtle':
      return colors.text.subtle;
    case 'inverted':
      return colors.text.inverted;
    case 'primary':
      return colors.primary[600]!;
    case 'danger':
      return colors.danger[700]!;
    case 'success':
      return colors.success[700]!;
    case 'warning':
      return colors.warning[700]!;
    case 'info':
      return colors.info[700]!;
  }
};

const weightMap: Record<NonNullable<TextProps['weight']>, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  tone,
  align,
  weight,
  color,
  style,
  children,
  ...rest
}) => {
  const resolvedTone = tone ?? variantDefaultTone[variant];
  const resolvedColor = color ?? toneColor(resolvedTone);
  const flat = StyleSheet.flatten([
    variantStyle[variant],
    { color: resolvedColor, textAlign: align },
    weight ? { fontWeight: weightMap[weight] } : null,
    style,
  ]);
  const [brand, inherit] = useBrandTextStyle(flat);

  return (
    <RNText style={brand ? [flat, brand] : flat} {...rest}>
      {withTextInherit(children, inherit)}
    </RNText>
  );
};

export type RawTextProps = RNTextProps;

/**
 * Ham RN `Text`'in yerine geçen, GÖRÜNÜŞÜ AYNI metin: varyant/ton varsayılanı YOK (RN
 * varsayılanları: 14pt, siyah), yalnız marka fontu (ağırlık → Noto Sans dosyası) ve gövde
 * harf aralığı eklenir. `react-native`'den `Text` import eden eski dosyaların geçiş noktası;
 * yeni kodda `Text` (variant + tone) kullanın. Dalga 2 bunları `Text`'e taşıyacak.
 */
export const RawText = React.forwardRef<React.ComponentRef<typeof RNText>, RawTextProps>(
  ({ style, children, ...rest }, ref) => {
    const flat = StyleSheet.flatten(style) ?? {};
    const [brand, inherit] = useBrandTextStyle(flat);
    return (
      <RNText ref={ref} style={brand ? [style, brand] : style} {...rest}>
        {withTextInherit(children, inherit)}
      </RNText>
    );
  },
);
RawText.displayName = 'RawText';
