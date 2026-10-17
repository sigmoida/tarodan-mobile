import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

/**
 * Ürün detayının dikey kaydırma konumu — üst barın kaydırma kenarı (`ScrollEdge`) galeri bitince
 * belirsin diye. Reanimated handler: kaydırma JS thread'ine uğramadan UI thread'inde sürülür.
 */
export function useProductScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  return { scrollY, onScroll };
}
