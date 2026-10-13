import { useCallback } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

/** Basılıyken ölçek (cam butonlar ve alt menü: opacity cam efektini bozduğu için ölçek kullanılır). */
export const PRESS_SCALE = 0.94;
/** Basma / bırakma yayı: ~120 ms algısal süre, hafif sönümlü (bırakınca çok az taşar). */
export const PRESS_SPRING = { duration: 120, dampingRatio: 0.7 } as const;

/**
 * Basınca hafif küçülüp bırakınca yaylanarak dönen ölçek (UI thread'i). `style`'ı bir
 * `Animated.View`'a ver; `onPressIn`/`onPressOut`'u Pressable'a bağla. "Reduce motion" açıkken ya da
 * `disabled` iken ölçek hiç değişmez.
 */
export function usePressScale(disabled?: boolean) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    if (reduceMotion || disabled) return;
    scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  }, [reduceMotion, disabled, scale]);
  const onPressOut = useCallback(() => {
    scale.value = reduceMotion ? 1 : withSpring(1, PRESS_SPRING);
  }, [reduceMotion, scale]);
  return { style, onPressIn, onPressOut };
}
