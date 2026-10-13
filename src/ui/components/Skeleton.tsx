import React, { useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { acquireSkeletonMotion, skeletonOpacity } from '../lib/skeletonMotion';

const { colors, radius, spacing } = theme;

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Varsayılan web `rounded-md` (4); daire için `theme.radius.full`. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Web `@tarodan/ui` Skeleton: `animate-pulse rounded-md bg-border-subtle`. Yükleme sırasında
 * içerik yerine yer tutar (liste/kart ekranlarında tam ekran spinner yerine). Hafif nabız;
 * "Hareketi azalt" açıksa sabit.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = spacing[4],
  borderRadius = radius.md,
  style,
  testID,
}) => {
  // Tek paylaşılan nabız (src/ui/lib/skeletonMotion): ilk örnek başlatır, son örnek durdurur.
  useEffect(() => acquireSkeletonMotion(), []);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius, opacity: skeletonOpacity }, style]}
    />
  );
};

/** Web `SkeletonText`: h-4 satırlar, aralık 8, son satır %75. */
export const SkeletonText: React.FC<{ lines?: number; style?: StyleProp<ViewStyle> }> = ({
  lines = 3,
  style,
}) => (
  <View style={[styles.textStack, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height={spacing[4]} width={i === lines - 1 ? '75%' : '100%'} />
    ))}
  </View>
);

/** Web `SkeletonCard`: kare görsel + iki satır (%75, %50). */
export const SkeletonCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <Skeleton width="100%" style={styles.square} />
    <View style={styles.textStack}>
      <Skeleton height={spacing[4]} width="75%" />
      <Skeleton height={spacing[4]} width="50%" />
    </View>
  </View>
);

const avatarSize = { sm: 32, md: 40, lg: 48 } as const;

/** Web `SkeletonAvatar`: yuvarlak 32 / 40 / 48. */
export const SkeletonAvatar: React.FC<{ size?: keyof typeof avatarSize }> = ({ size = 'md' }) => (
  <Skeleton width={avatarSize[size]} height={avatarSize[size]} borderRadius={radius.full} />
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border.subtle,
  },
  textStack: {
    gap: spacing[2],
  },
  card: {
    gap: spacing[4],
  },
  square: {
    height: undefined,
    aspectRatio: 1,
  },
});
