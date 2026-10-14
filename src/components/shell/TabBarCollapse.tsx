import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Easing,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from '@/ui';
import { pageScrollOffset } from '@/ui/lib/pageScroll';
import {
  normalizeScrollMetrics,
  rebaseOnExternalChange,
  reduceTabBarScroll,
  shouldExpandOnMeasure,
} from './tabBarScroll';

/**
 * Alt menü daralma sinyalinin TEK kaynağı: tab layout'ta bir paylaşılan değer (`collapsed`);
 * sekme köklerinin kaydırılabilir listeleri `useTabBarScrollHandler` ile yazar, `AppTabBar` okur.
 */
/** `onOffset` köprüsünün en küçük ofset adımı (pt). */
const OFFSET_BRIDGE_STEP = 16;

/** Daralma animasyonu: süre = theme.duration.normal (250ms), web `premium` eğrisi cubic-bezier(.4,0,.2,1). */
export const TAB_BAR_ANIM_MS = theme.duration.normal;
const TAB_BAR_EASING = Easing.bezier(0.4, 0, 0.2, 1);

const TabBarCollapseContext = createContext<SharedValue<boolean> | null>(null);

export function TabBarCollapseProvider({ children }: { children: ReactNode }) {
  const collapsed = useSharedValue(false);
  return <TabBarCollapseContext.Provider value={collapsed}>{children}</TabBarCollapseContext.Provider>;
}

/**
 * Tab layout'un odağı değişince (yığın ekranından geri dönüş) menüyü açık hale getirir. Navigasyon
 * bağlamı gerektirir; YALNIZ `app/(tabs)/_layout.tsx`'te provider'ın içinde kullanılır (ekran
 * bileşenlerinde değil: onların testleri navigasyon sağlayıcısı olmadan render eder).
 */
export function TabBarFocusReset() {
  const collapsed = useTabBarCollapsed();
  useFocusEffect(
    useCallback(() => {
      collapsed.value = false;
    }, [collapsed]),
  );
  return null;
}

/** Paylaşılan `collapsed` değeri; provider yoksa (tab dışı kullanım / testler) yerel yedek döner. */
export function useTabBarCollapsed(): SharedValue<boolean> {
  const ctx = useContext(TabBarCollapseContext);
  const fallback = useSharedValue(false);
  return ctx ?? fallback;
}

/**
 * Daralma animasyonunun ilerlemesi: 0 = açık, 1 = daralmış (UI thread'inde `withTiming`, 250ms,
 * "reduce motion" açıkken anında). Alt menü VE ana sayfa üst barı AYNI `collapsed` sinyalinden aynı
 * süre/eğriyle türetir; ikisi birlikte daralır/açılır.
 */
export function useTabBarProgress(): DerivedValue<number> {
  const collapsed = useTabBarCollapsed();
  const reduceMotion = useReducedMotion();
  return useDerivedValue<number>(() => {
    const target = collapsed.value ? 1 : 0;
    return reduceMotion ? target : withTiming(target, { duration: TAB_BAR_ANIM_MS, easing: TAB_BAR_EASING });
  });
}

/**
 * `collapsed`'ın JS tarafı aynası: daralınca `true`. Daralan öğenin dokunmaya (`pointerEvents`) ve
 * ekran okuyucuya kapatılması için (animasyon değeri UI thread'inde kalır, bu yalnız değişimde render eder).
 */
export function useTabBarCollapsedFlag(): boolean {
  const collapsed = useTabBarCollapsed();
  const [flag, setFlag] = useState(false);
  useAnimatedReaction(
    () => collapsed.value,
    (isCollapsed, previous) => {
      if (isCollapsed !== previous) scheduleOnRN(setFlag, isCollapsed);
    },
  );
  return flag;
}

/**
 * Animated ScrollView / FlatList / FlashList'e `onScroll` olarak verilen worklet handler (UI thread'i).
 * Dönen `{ onScroll, onContentSizeChange, onLayout }` listeye yayılır:
 * `<Animated.ScrollView {...tabScroll} scrollEventThrottle={16} />` (kendi onLayout'u olan ekran ikisini çağırır).
 */
export function useTabBarScrollHandler(onOffset?: (y: number) => void, pageScrollY?: SharedValue<number>) {
  const collapsed = useTabBarCollapsed();
  const contentH = useSharedValue(0);
  const layoutH = useSharedValue(0);
  const anchor = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastSent = useSharedValue(0);
  // Bu listenin son gördüğü menü durumu (dışarıdan değişimi algılamak için; bkz. `rebaseOnExternalChange`).
  const lastSeen = useSharedValue(false);

  // Kaydırma olayı üretmeyen ölçüm değişiklikleri: kısa/başa dönmüş içerikte menüyü aç.
  const expandIfFits = useCallback(() => {
    if (collapsed.value && shouldExpandOnMeasure(contentH.value, layoutH.value, lastY.value)) {
      collapsed.value = false;
    }
  }, [collapsed, contentH, layoutH, lastY]);
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentH.value = h;
      expandIfFits();
    },
    [contentH, expandIfFits],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      layoutH.value = e.nativeEvent.layout.height;
      expandIfFits();
    },
    [layoutH, expandIfFits],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      // iOS `contentInset` (ör. ana sayfanın yüzen üst barı) varken dinlenme ofseti -inset'tir:
      // eşik mantığı inset'ten bağımsız olsun diye ofset/aralık inset'le normalize edilir.
      const m = normalizeScrollMetrics(
        e.contentOffset.y,
        e.contentSize.height,
        e.layoutMeasurement.height,
        e.contentInset?.top ?? 0,
        e.contentInset?.bottom ?? 0,
      );
      // Menü dışarıdan değiştiyse (daralmış daireye dokunma / sekme değişimi) seri o anki konumdan başlar.
      const prev = rebaseOnExternalChange(
        { collapsed: collapsed.value, anchor: anchor.value, lastY: lastY.value },
        lastSeen.value,
      );
      const next = reduceTabBarScroll(prev, m.y, m.maxY);
      lastSeen.value = next.collapsed;
      // Üst barın kaydırma kenarı (`pageScrollY`) AYNI handler'dan beslenir: ekran iki ayrı `onScroll`
      // vermez. Ofset inset'ten bağımsız (0 = içerik başı).
      if (pageScrollY) pageScrollY.value = pageScrollOffset(e.contentOffset.y, e.contentInset?.top ?? 0);
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

  return { onScroll, onContentSizeChange, onLayout };
}
