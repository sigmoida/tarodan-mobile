import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
 * Yalnız sinyal değeri (handler YOK): the shell's own value (tab roots, the listing form) whose list
 * feeds it with `usePageOffsetHandler(page.scrollY)`.
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

/** Smallest offset step (pt) of the optional JS bridge in `usePageOffsetHandler`. */
const OFFSET_BRIDGE_STEP = 16;

/**
 * The scroll worklet that feeds a page's `scrollY` (the top bar scroll edge), for a list bound to a
 * `PageScrollValue` it did not create (tab roots: `usePageScrollValue()` + this). `onOffset` is an
 * optional JS bridge (e.g. the home hero visibility): called every >= 16 pt and at the top, not on
 * every frame. Spread as `onScroll={handler}` with `scrollEventThrottle={16}`.
 */
export function usePageOffsetHandler(scrollY: SharedValue<number>, onOffset?: (y: number) => void) {
  const lastSent = useSharedValue(0);
  return useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        scrollY.value = pageScrollOffset(e.contentOffset.y, e.contentInset?.top ?? 0);
        if (onOffset) {
          const y = e.contentOffset.y;
          if (Math.abs(y - lastSent.value) >= OFFSET_BRIDGE_STEP || (y <= 0 && lastSent.value !== y)) {
            lastSent.value = y;
            scheduleOnRN(onOffset, y);
          }
        }
      },
    },
    [scrollY, onOffset],
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
  const onScroll = usePageOffsetHandler(value.scrollY);
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

/**
 * Kabuk bağlamı sağlayıcısı. Modül seviyesinde SABİT bileşen: tipi hiç değişmez, bu yüzden
 * `topInset` gibi değerler değişse bile kabuğun altındaki ağaç yeniden mount OLMAZ (form verisi ve
 * kaydırma konumu korunur). Bileşen `useMemo` ile ÜRETİLMEZ.
 */
export function ShellScrollProvider({ value, children }: { value: ShellScrollContextValue; children?: React.ReactNode }) {
  return <ShellScrollContext.Provider value={value}>{children}</ShellScrollContext.Provider>;
}

export type { ShellScrollContextValue };

export interface ShellScroll {
  page: PageScrollValue;
  /** Kaydırma sinyali bir listeye bağlı mı (bağlıysa gövde bar altında başlamaz, liste inset'i verir). */
  bound: boolean;
  /** `<ShellScrollProvider value={ctx}>` ile çocuklara verilen bağlam (`useShellPageScroll`). */
  ctx: ShellScrollContextValue;
}

/**
 * Kenar efektinin kaynağı bir listeye (yeniden) bağlandığında ya da ayrıldığında `scrollY`'yi 0'a
 * çeker: loading → içerik geçişinde yeni liste ilk kaydırmaya kadar bayat ofsetle opak şerit göstermez.
 */
export function useResetScrollOnBind(scrollY: SharedValue<number>, bound: boolean): void {
  useLayoutEffect(() => {
    scrollY.value = 0;
  }, [scrollY, bound]);
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
  return { page, bound, ctx, own };
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
