import React, { useMemo, useState } from 'react';
import {
  Animated,
  StyleSheet,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';
import { useSkeletonAnimation } from './skeletonAnimation';

const { colors, radius, spacing, loading } = theme;

export interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Varsayılan web `rounded-md` (4); daire için `theme.radius.full`. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * TÜM iskeletlerin TEK görsel primitive'i (web `@tarodan/ui` Skeleton: `animate-pulse rounded-md
 * bg-border-subtle`). Renk ve animasyon `theme.loading.skeleton` + ortak sürücüden
 * (`useSkeletonAnimation`) gelir; yapı taşları (`SkeletonText`, `SkeletonSectionCard`,
 * `SkeletonProductCard`…) yalnız bu bloğu dizer — kendi rengini/animasyonunu yazmaz.
 * Ekran okuyucudan gizlidir (yükleniyor duyurusu kabuk/gösterge işidir).
 */
export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width,
  height = spacing[4],
  borderRadius = radius.md,
  style,
  testID,
}) => {
  const anim = useSkeletonAnimation();
  const shimmer = anim.kind === 'shimmer';
  // Parlama şeridi blok genişliği kadar soldan sağa geçer → genişlik ölçülür (yalnız shimmer'da).
  const [blockWidth, setBlockWidth] = useState(0);
  const onLayout = shimmer
    ? (e: LayoutChangeEvent) => setBlockWidth(e.nativeEvent.layout.width)
    : undefined;
  const translateX = useMemo(
    () =>
      shimmer && blockWidth > 0
        ? anim.progress.interpolate({ inputRange: [0, 1], outputRange: [-blockWidth, blockWidth] })
        : null,
    [shimmer, blockWidth, anim.progress],
  );

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={[
        styles.base,
        { width, height, borderRadius },
        anim.opacity ? { opacity: anim.opacity } : null,
        style,
      ]}
    >
      {translateX ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={[colors.overlay.white0, loading.skeleton.highlightColor, colors.overlay.white0]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: loading.skeleton.baseColor,
    overflow: 'hidden',
  },
});
