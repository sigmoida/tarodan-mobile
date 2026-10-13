import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useHeaderBarInset } from './header';

/**
 * Yüzen üst barın kaydırma kenarı (scroll edge) sinyali. İçerik bar ALTINDAN kayar; bar altında
 * yumuşak bir beyaz geçiş (`ScrollEdge`) kaydırma ofsetine göre belirir. Sinyalin tek kaynağı
 * `scrollY`: 0 = içerik başı (iOS `contentInset` ve Android üst dolgusu normalize edilmiş).
 */

/** Kenar efektinin TAM göründüğü kaydırma ofseti (pt); 0'da yok, arası doğrusal. */
export const SCROLL_EDGE_FULL_AT = 24;

/** Kaydırma ofsetinden kenar efektinin opaklığı (0..1) — SAF worklet. Üst bounce (negatif) = 0. */
export function scrollEdgeOpacity(y: number): number {
  'worklet';
  if (y <= 0) return 0;
  if (y >= SCROLL_EDGE_FULL_AT) return 1;
  return y / SCROLL_EDGE_FULL_AT;
}

/**
 * Ham kaydırma olayını `scrollY`'ye çevirir — SAF worklet. iOS'ta liste `contentInset.top` ile
 * başlıyorsa dinlenme ofseti `-inset`tir; inset eklenince 0'a normalize olur.
 */
export function pageScrollOffset(offsetY: number, insetTop = 0): number {
  'worklet';
  return offsetY + insetTop;
}

/**
 * Listenin üst boşluğunu bar yüksekliği kadar açan stil — SAF. iOS'ta `scrollProps`
 * (`contentInset`) bunu yapar, stil aynen döner; Android'de içerik `paddingTop`una eklenir
 * (verilen `paddingTop` / `paddingVertical` / `padding` üstüne).
 */
export function withTopInset(
  base: StyleProp<ViewStyle>,
  inset: number,
  os: string = Platform.OS,
): StyleProp<ViewStyle> {
  if (os === 'ios') return base;
  const flat = StyleSheet.flatten(base) ?? {};
  const current = flat.paddingTop ?? flat.paddingVertical ?? flat.padding ?? 0;
  return { ...flat, paddingTop: (typeof current === 'number' ? current : 0) + inset };
}

/** iOS: üst boşluk `contentInset` (çekip yenileme göstergesi barın ALTINDA açılır). Android: boş. */
export function pageScrollProps(inset: number, os: string = Platform.OS): Partial<ScrollViewProps> {
  if (os !== 'ios') return {};
  return {
    contentInset: { top: inset },
    contentOffset: { x: 0, y: -inset },
    scrollIndicatorInsets: { top: inset },
    automaticallyAdjustContentInsets: false,
    contentInsetAdjustmentBehavior: 'never',
  };
}

export interface PageScrollValue {
  /** Normalize kaydırma ofseti (0 = içerik başı). */
  scrollY: SharedValue<number>;
  /** Güvenli alan üstü + bar satırı (pt) = listenin üst boşluğu. */
  topInset: number;
  /** Listeye yayılır: `<Animated.FlatList {...page.scrollProps} />` (iOS `contentInset`). */
  scrollProps: Partial<ScrollViewProps>;
  /** `contentContainerStyle` için: `page.contentStyle(pageListContentStyle)` (Android üst dolgusu). */
  contentStyle: (base?: StyleProp<ViewStyle>) => StyleProp<ViewStyle>;
}

export interface PageScroll extends PageScrollValue {
  /** Reanimated scroll handler: `<Animated.FlatList onScroll={page.onScroll} />`. */
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  scrollEventThrottle: number;
  /**
   * `<Animated.FlatList {...page.listProps} contentContainerStyle={page.contentStyle(base)} />`:
   * handler + iOS inset + Android yenileme göstergesi ofseti tek yayılımda.
   */
  listProps: Partial<ScrollViewProps> & {
    onScroll: ReturnType<typeof useAnimatedScrollHandler>;
    scrollEventThrottle: number;
    progressViewOffset: number;
  };
}

/**
 * Yalnız sinyal değeri (handler YOK) — başka bir handler `scrollY`'yi besleyecekse (sekme kökleri:
 * `useTabBarScrollHandler(undefined, page.scrollY)` tek handler ile hem alt menüyü hem üst barı sürer).
 */
export function usePageScrollValue(): PageScrollValue {
  const scrollY = useSharedValue(0);
  const topInset = useHeaderBarInset();
  return useMemo(
    () => ({
      scrollY,
      topInset,
      scrollProps: pageScrollProps(topInset),
      contentStyle: (base?: StyleProp<ViewStyle>) => withTopInset(base, topInset),
    }),
    [scrollY, topInset],
  );
}

/**
 * Ekran kendi listesini çiziyorsa (PageShell `mode="list"` / `static`, AppShell title) kaydırma
 * sinyalini kuran hook. Kullanım:
 *
 * ```tsx
 * const page = usePageScrollHandler();
 * <PageShell mode="list" scroll={page}>
 *   <Animated.FlatList onScroll={page.onScroll} scrollEventThrottle={16}
 *     {...page.scrollProps} contentContainerStyle={page.contentStyle(pageListContentStyle)} />
 * ```
 *
 * `scroll` verilmezse kabuk gövdeyi bar altından başlatır ve kenar efekti SABİT şerit olur.
 */
export function usePageScrollHandler(): PageScroll {
  const value = usePageScrollValue();
  const { scrollY } = value;
  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        scrollY.value = pageScrollOffset(e.contentOffset.y, e.contentInset?.top ?? 0);
      },
    },
    [scrollY],
  );
  return useMemo(
    () => ({
      ...value,
      onScroll,
      scrollEventThrottle: 16,
      listProps: {
        ...value.scrollProps,
        onScroll,
        scrollEventThrottle: 16,
        progressViewOffset: value.topInset,
      },
    }),
    [value, onScroll],
  );
}

interface ShellScrollContextValue {
  page: PageScroll;
  /** Çocuk kendi listesini bu sinyale bağladığında kabuk üst dolguyu bırakır. */
  setBound: (bound: boolean) => void;
}

const ShellScrollContext = createContext<ShellScrollContextValue | null>(null);

export interface ShellScroll {
  page: PageScrollValue;
  /** Kaydırma sinyali bir listeye bağlı mı (bağlıysa gövde bar altında başlamaz, liste inset'i verir). */
  bound: boolean;
  /** Çocuklara `useShellPageScroll` ile verilen bağlam. */
  Provider: React.FC<{ children?: React.ReactNode }>;
}

/**
 * Kabukların (PageShell, AppShell) kaydırma durumu: ekranın verdiği `provided` (varsa) ya da
 * kabuğun kendi sinyali. `bindOwn`: kabuk kendi ScrollView'ını bağlıyor (PageShell scroll modu).
 */
export function useShellScrollState(provided: PageScrollValue | undefined, bindOwn: boolean): ShellScroll & { own: PageScroll } {
  const own = usePageScrollHandler();
  const [childBound, setChildBound] = useState(false);
  const page = provided ?? own;
  const bound = !!provided || childBound || bindOwn;
  const ctx = useMemo<ShellScrollContextValue>(() => ({ page: own, setBound: setChildBound }), [own]);
  const Provider = useMemo<ShellScroll['Provider']>(
    () =>
      function ShellScrollProvider({ children }) {
        return <ShellScrollContext.Provider value={ctx}>{children}</ShellScrollContext.Provider>;
      },
    [ctx],
  );
  // Bağlı olmayan gövdede sinyal bayat kalmasın (efekt sabit şeride döner).
  const reset = useCallback(() => {
    if (!bound) own.scrollY.value = 0;
  }, [bound, own.scrollY]);
  useLayoutEffect(reset, [reset]);
  return { page, bound, Provider, own };
}

/**
 * Kabuğun ÇOCUĞU olan bir bileşen (ör. `ListingForm` sekme kökünde AppShell içinde) kendi listesini
 * kabuğun sinyaline bağlar: `{ onScroll, scrollProps, contentStyle, scrollY }` döner; kabuk yoksa
 * `null`. `enabled=false` iken (kapı ekranı) bağlanmaz, gövde bar altında kalır.
 */
export function useShellPageScroll(enabled = true): PageScroll | null {
  const ctx = useContext(ShellScrollContext);
  const setBound = ctx?.setBound;
  useLayoutEffect(() => {
    if (!setBound || !enabled) return undefined;
    setBound(true);
    return () => setBound(false);
  }, [setBound, enabled]);
  return ctx?.page ?? null;
}
