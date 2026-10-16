import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { isHeroInView, type HeroViewMetrics } from '../_lib/heroVisibility';

/**
 * Ana sayfa ScrollView'inin kaydırma ofsetinden "hero görünür alanda mı" sinyali.
 * Ölçümler ref'te tutulur; state yalnız sonuç DEĞİŞİNCE güncellenir (kaydırma
 * sırasında yeniden çizim yok). `onScroll`/`onViewportLayout` ScrollView'e,
 * `onHeroLayout` hero'yu saran görünüme bağlanır.
 */
export function useHeroVisibility() {
  const [visible, setVisible] = useState(true);
  const metrics = useRef<HeroViewMetrics>({ scrollY: 0, viewportHeight: 0, top: 0, height: 0 });

  const update = useCallback(() => setVisible(isHeroInView(metrics.current)), []);

  /** Ofset doğrudan (UI thread'i handler'ı `useTabBarScrollHandler(onOffset)` ile köprüler). */
  const onScrollOffset = useCallback(
    (y: number) => {
      metrics.current.scrollY = y;
      update();
    },
    [update],
  );
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => onScrollOffset(e.nativeEvent.contentOffset.y),
    [onScrollOffset],
  );
  const onViewportLayout = useCallback(
    (e: LayoutChangeEvent) => {
      metrics.current.viewportHeight = e.nativeEvent.layout.height;
      update();
    },
    [update],
  );
  const onHeroLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // 0/geçersiz yükseklik = hero yok ya da henüz ölçülmedi → "görünür" (isHeroInView).
      const { y, height } = e.nativeEvent.layout;
      metrics.current.top = Number.isFinite(y) ? y : 0;
      metrics.current.height = Number.isFinite(height) && height > 0 ? height : 0;
      update();
    },
    [update],
  );

  return { visible, onScroll, onScrollOffset, onViewportLayout, onHeroLayout };
}
