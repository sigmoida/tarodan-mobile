import { useMemo, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Ürün detayının dikey kaydırma konumu — üst barın (adaların arkasındaki beyaz zemin) galeri
 * bitince belirmesi için. Native driver: kaydırma JS thread'ine uğramadan opaklığı sürer.
 */
export function useProductScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );
  return { scrollY, onScroll };
}
