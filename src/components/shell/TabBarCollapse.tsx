import { createContext, useContext, type ReactNode } from 'react';
import { useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { reduceTabBarScroll } from './tabBarScroll';

/**
 * Alt menü daralma sinyalinin TEK kaynağı: tab layout'ta bir paylaşılan değer (`collapsed`);
 * sekme köklerinin kaydırılabilir listeleri `useTabBarScrollHandler` ile yazar, `AppTabBar` okur.
 */
/** `onOffset` köprüsünün en küçük ofset adımı (pt). */
const OFFSET_BRIDGE_STEP = 16;

const TabBarCollapseContext = createContext<SharedValue<boolean> | null>(null);

export function TabBarCollapseProvider({ children }: { children: ReactNode }) {
  const collapsed = useSharedValue(false);
  return <TabBarCollapseContext.Provider value={collapsed}>{children}</TabBarCollapseContext.Provider>;
}

/** Paylaşılan `collapsed` değeri; provider yoksa (tab dışı kullanım / testler) yerel yedek döner. */
export function useTabBarCollapsed(): SharedValue<boolean> {
  const ctx = useContext(TabBarCollapseContext);
  const fallback = useSharedValue(false);
  return ctx ?? fallback;
}

/**
 * Animated ScrollView / FlatList / FlashList'e `onScroll` olarak verilen worklet handler (UI thread'i).
 * Kullanım: `<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />`.
 */
export function useTabBarScrollHandler(onOffset?: (y: number) => void) {
  const collapsed = useTabBarCollapsed();
  const anchor = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastSent = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const maxY = e.contentSize.height - e.layoutMeasurement.height;
      const next = reduceTabBarScroll(
        { collapsed: collapsed.value, anchor: anchor.value, lastY: lastY.value },
        e.contentOffset.y,
        maxY,
      );
      anchor.value = next.anchor;
      lastY.value = next.lastY;
      if (next.collapsed !== collapsed.value) collapsed.value = next.collapsed;
      // İsteğe bağlı JS köprüsü (ör. ana sayfa hero görünürlüğü): her karede değil, >= 16pt'de bir.
      if (onOffset) {
        const y = e.contentOffset.y;
        if (Math.abs(y - lastSent.value) >= OFFSET_BRIDGE_STEP || (y <= 0 && lastSent.value !== y)) {
          lastSent.value = y;
          scheduleOnRN(onOffset, y);
        }
      }
    },
  });
}
