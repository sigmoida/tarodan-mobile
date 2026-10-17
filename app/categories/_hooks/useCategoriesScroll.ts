import { useCallback, useMemo } from 'react';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { pageScrollOffset, usePageScrollValue } from '@/ui';

/**
 * Kategoriler ekranının üst bar kaydırma sinyali. Ekranda İKİ bağımsız liste var (sol ray + sağ
 * ızgara); ikisi de bar ALTINDAN kayar. Kenar (`ScrollEdge`) ikisinden hangisi daha aşağıdaysa ona
 * göre belirir: her liste kendi ofsetini tutar, `page.scrollY` = ikisinin büyüğü.
 * `resetGrid`: ızgara yeniden kurulunca (grup/düzey değişimi, en başa döner) bayat ofseti siler.
 */
export function useCategoriesScroll() {
  const page = usePageScrollValue();
  const { scrollY } = page;
  const railY = useSharedValue(0);
  const gridY = useSharedValue(0);

  const onRailScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      railY.value = pageScrollOffset(e.contentOffset.y, e.contentInset?.top ?? 0);
      scrollY.value = Math.max(railY.value, gridY.value);
    },
  });
  const onGridScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      gridY.value = pageScrollOffset(e.contentOffset.y, e.contentInset?.top ?? 0);
      scrollY.value = Math.max(railY.value, gridY.value);
    },
  });

  const resetGrid = useCallback(() => {
    gridY.value = 0;
    scrollY.value = railY.value;
  }, [gridY, railY, scrollY]);

  return useMemo(
    () => ({ page, onRailScroll, onGridScroll, resetGrid }),
    [page, onRailScroll, onGridScroll, resetGrid],
  );
}

export type CategoriesScroll = ReturnType<typeof useCategoriesScroll>;
