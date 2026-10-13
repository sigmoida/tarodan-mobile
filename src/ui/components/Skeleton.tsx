import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';

const { colors, radius, spacing } = theme;

/** Web `animate-pulse`: 2 sn'lik döngüde opaklık 1 → 0.5 → 1. */
const PULSE_HALF_MS = 1000;

/** Sistemde "Hareketi azalt" açık mı? Açıksa iskeletler sabit durur. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduce(!!v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

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
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: PULSE_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity]);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius, opacity }, style]}
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
