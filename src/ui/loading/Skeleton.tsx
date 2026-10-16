import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { AVATAR_SIZES } from '../components/Avatar';
import { SkeletonBlock, type SkeletonBlockProps } from './SkeletonBlock';

const { radius, spacing, typography } = theme;

/** Geriye uyum: `Skeleton` = `SkeletonBlock` (aynı primitive; yeni kod da ikisinden birini kullanır). */
export type SkeletonProps = SkeletonBlockProps;
export const Skeleton = SkeletonBlock;

/** `Text` varyantlarının satır kutusu (pt): yazı boyu × satır aralığı — `Text.tsx` ile aynı formül. */
const LINE = {
  displaySm: { font: typography.fontSize['3xl'], line: typography.fontSize['3xl'] * typography.lineHeight.tight },
  h1: { font: typography.fontSize['2xl'], line: typography.fontSize['2xl'] * typography.lineHeight.tight },
  h2: { font: typography.fontSize.xl, line: typography.fontSize.xl * typography.lineHeight.snug },
  h3: { font: typography.fontSize.lg, line: typography.fontSize.lg * typography.lineHeight.snug },
  body: { font: typography.fontSize.base, line: typography.fontSize.base * typography.lineHeight.normal },
  bodySm: { font: typography.fontSize.sm, line: typography.fontSize.sm * typography.lineHeight.normal },
  caption: { font: typography.fontSize.xs, line: typography.fontSize.xs * typography.lineHeight.normal },
  label: { font: typography.fontSize.sm, line: typography.fontSize.sm * typography.lineHeight.snug },
} as const;

export type SkeletonLineVariant = keyof typeof LINE;

/** Bir `Text` varyantının satır yüksekliği (iskeletin gerçek metinle aynı dikey yeri kaplaması için). */
export const skeletonLineHeight = (variant: SkeletonLineVariant): number => LINE[variant].line;

export interface SkeletonLineProps {
  /** Yerini tuttuğu `Text` varyantı — kutu yüksekliği o varyantın satır yüksekliği. */
  variant?: SkeletonLineVariant;
  /** Gerçek metin `lineHeight`'ı ezdiyse (ör. kart başlığı `tight`) aynı değer. */
  lineHeight?: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tek metin satırı — gerçek `Text` satırıyla AYNI yükseklikte kutu, içinde yazı boyunda blok
 * (veri gelince satır kaymaz).
 */
export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  variant = 'body',
  lineHeight,
  width = '100%',
  style,
}) => {
  const line = lineHeight ?? LINE[variant].line;
  return (
    <View style={[styles.lineBox, { height: line, width }, style]}>
      <SkeletonBlock width="100%" height={Math.min(LINE[variant].font, line)} />
    </View>
  );
};

/** Web `SkeletonText`: h-4 satırlar, aralık 8, son satır %75. */
export const SkeletonText: React.FC<{ lines?: number; style?: StyleProp<ViewStyle> }> = ({
  lines = 3,
  style,
}) => (
  <View style={[styles.textStack, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock key={i} height={spacing[4]} width={i === lines - 1 ? '75%' : '100%'} />
    ))}
  </View>
);

/** Web `SkeletonCard`: kare görsel + iki satır (%75, %50). */
export const SkeletonCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <SkeletonBlock width="100%" style={styles.square} />
    <View style={styles.textStack}>
      <SkeletonBlock height={spacing[4]} width="75%" />
      <SkeletonBlock height={spacing[4]} width="50%" />
    </View>
  </View>
);

/** Yuvarlak avatar — çap `Avatar` ile aynı ölçekten (`AVATAR_SIZES`; sm 28 · md 40 · lg 56 …). */
export const SkeletonAvatar: React.FC<{ size?: keyof typeof AVATAR_SIZES }> = ({ size = 'md' }) => (
  <SkeletonBlock width={AVATAR_SIZES[size]} height={AVATAR_SIZES[size]} borderRadius={radius.full} />
);

const styles = StyleSheet.create({
  lineBox: { justifyContent: 'center' },
  textStack: { gap: spacing[2] },
  card: { gap: spacing[4] },
  square: { height: undefined, aspectRatio: 1 },
});
