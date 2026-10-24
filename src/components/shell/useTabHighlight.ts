import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/ui';

/** Vurgu kayma süresi: theme.duration.normal (250ms), web `premium` eğrisi. */
export const TAB_HIGHLIGHT_MS = theme.duration.normal;
const EASING = Easing.bezier(0.4, 0, 0.2, 1);
const TIMING = { duration: TAB_HIGHLIGHT_MS, easing: EASING } as const;

interface ItemLayout {
  x: number;
  width: number;
}

/**
 * Alt menü aktif-sekme vurgusu: sekmeler `onItemLayout(key)` ile ölçülür; vurgu (`style`) aktif
 * sekmenin x / genişliğine `withTiming` ile KAYAR (translateX + width). İlk yerleşim animasyonsuz
 * oturur; aktif sekme yoksa (menülü yığın ekranı) vurgu solar. "Reduce motion" açıkken anında geçer.
 */
export function useTabHighlight(activeKey: string | undefined) {
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, ItemLayout>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useRef(false);

  const onItemLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      const { x: lx, width: lw } = e.nativeEvent.layout;
      setLayouts((prev) =>
        prev[key]?.x === lx && prev[key]?.width === lw ? prev : { ...prev, [key]: { x: lx, width: lw } },
      );
    },
    [],
  );

  const target = activeKey ? layouts[activeKey] : undefined;
  useEffect(() => {
    if (!target) {
      shown.value = placed.current && !reduceMotion ? withTiming(0, TIMING) : 0;
      return;
    }
    if (!placed.current || reduceMotion) {
      x.value = target.x;
      width.value = target.width;
      shown.value = 1;
      placed.current = true;
      return;
    }
    x.value = withTiming(target.x, TIMING);
    width.value = withTiming(target.width, TIMING);
    shown.value = withTiming(1, TIMING);
  }, [target, reduceMotion, x, width, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));

  return { style, onItemLayout };
}
