import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Router from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';
import {
  contentFadeOpacity,
  contentTranslateX,
  dragProgress,
  isBaseTabsFocused,
  openDragProgress,
  shouldCloseOnRelease,
  shouldOpenOnRelease,
  sideMenuEdgeWidth,
  sideMenuWidth,
  type NavStateLike,
} from './sideMenuMotion';
import { useSideMenu } from './SideMenuContext';
import { isProfileTabRoot } from './shellLeading';

export { sideMenuWidth, SIDE_MENU_MAX_WIDTH, SIDE_MENU_WIDTH_RATIO } from './sideMenuMotion';

const { colors, duration } = theme;

/** Sürükleme, yatayda bu kadar hareketten sonra başlar (dikey kaydırma/dokunuşlar bozulmasın). */
const PAN_ACTIVE_OFFSET_X = 12;
const PAN_FAIL_OFFSET_Y = 16;
/** Kenar şeridi (platforma göre; bkz. `sideMenuEdgeWidth`). */
const EDGE_WIDTH = sideMenuEdgeWidth(Platform.OS);

/**
 * Kenardan açma yalnız TABAN Profil sekme kökünde (☰ yalnız orada; diğer sekme köklerinde sol
 * düğme kategorilerdir — `shellLeadingAction`): segmentler `(tabs)/profile`, kök yığın indeksi 0 ve
 * o rota `(tabs)` (`isBaseTabsFocused`). Yığın ekranlarında — ve üste itilmiş ikinci bir `(tabs)` kopyasında — sol
 * kenar iOS'un "kaydırarak geri" jestine aittir. `useSegments` her gezinmede yeniden çizimi tetikler;
 * yığın derinliği kapsayıcı ref'inden okunur. `* as Router`: expo-router'ı kısmi mock'layan testlerde
 * kanca yoksa kapalı.
 */
function useEdgeSwipeEnabled(): boolean {
  const segments = (Router.useSegments?.() ?? []) as string[];
  const navRef = Router.useNavigationContainerRef?.();
  if (!isProfileTabRoot(segments)) return false;
  try {
    return isBaseTabsFocused(navRef?.getRootState?.() as NavStateLike | undefined);
  } catch {
    return false;
  }
}
/** Ekran okuyucu odağını menüye taşımadan önce animasyonun başlamasını bekle (ms). */
const A11Y_FOCUS_DELAY_MS = 350;

const EASING = Easing.bezier(0.4, 0, 0.2, 1);
/** Kapanış animasyonu bitiş geri çağrısına güvenmeden, süre dolunca zorla sökmek için pay (ms). */
const FORCE_UNMOUNT_SLACK_MS = 100;

interface SideMenuHostProps {
  /** Menü paneli içeriği (DrawerMenu) — yalnız menü açıkken bağlanır. */
  menu: React.ReactNode;
  /** Kayan uygulama içeriği: kök navigasyon görünümü (Stack, tab bar dahil). */
  children: React.ReactNode;
}

/**
 * Yan menü kabuğu — kök layout'ta Stack'i SARAR ("push" çekmece, Reddit gibi). Tek bir kayan
 * taşıyıcı: `[panel (menü genişliği)] [uygulama içeriği (ekran genişliği)]` yan yana, taşıyıcı
 * `left = -width` ile panel ekran dışında bekler; `translateX = progress * width` ile İKİSİ BİRLİKTE
 * sağa kayar (içerik menü genişliği kadar itilir, sağda ~%20'si görünür kalır). Koyu örtü YOK;
 * içeriğin üstünde hafif beyaz soluklaştırma + dokununca kapanır. Panel taşıyıcının sınırları
 * içinde kaldığı için dokunma hedeflemesi (iOS/Android overflow) sorunsuz.
 *
 * Toast / AlertDialog host'ları bu bileşenin DIŞINDA (kök layout'ta kardeş) — kaymazlar.
 * Animasyon UI thread'inde (tek `progress` shared value); "hareketi azalt" açıkken anında.
 * Panel içeriği yalnız menü açıkken bağlanır → kapalıyken sorgu/abonelik yok.
 */
export function SideMenuHost({ menu, children }: SideMenuHostProps) {
  const { isOpen, open, close } = useSideMenu();
  const edgeEnabled = useEdgeSwipeEnabled();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const width = sideMenuWidth(windowWidth);
  const animMs = reduceMotion ? 0 : duration.normal;

  // 0 = kapalı, 1 = açık. İçerik/panel konumu ve soluklaştırma bundan türer.
  const progress = useSharedValue(0);
  // `isOpen`ın worklet tarafındaki aynası: jest geri çağrıları kapanıştan SONRA gelirse progress'i ezmesin.
  const isOpenSV = useSharedValue(isOpen);
  // Kapanış animasyonu bitene dek bağlı kalır.
  const [mounted, setMounted] = useState(false);
  // Kenardan açma sürüklemesi sürüyor: panel bağlı, zorla söküm emniyeti beklemede.
  const [edgeDragging, setEdgeDragging] = useState(false);
  const beginEdgeDrag = useCallback(() => {
    setMounted(true);
    setEdgeDragging(true);
  }, []);
  const endEdgeDrag = useCallback(() => setEdgeDragging(false), []);
  const closeRef = useRef<View>(null);

  // Kapanış animasyonu bitince söker — ama bu arada yeniden açıldıysa dokunmaz.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const unmount = useCallback(() => {
    if (!isOpenRef.current) setMounted(false);
  }, []);

  // Efektlerden (ve jest iptalinden) ÖNCE güncel olsun diye layout efekti.
  useLayoutEffect(() => {
    isOpenSV.value = isOpen;
  }, [isOpen, isOpenSV]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      progress.value = withTiming(1, { duration: animMs, easing: EASING });
    } else {
      progress.value = withTiming(0, { duration: animMs, easing: EASING }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(unmount);
      });
    }
  }, [isOpen, animMs, progress, unmount]);

  // Emniyet: kapanış animasyonu kesilirse (`finished=false`) bile menü takılı kalmasın —
  // süre + pay sonra progress'i 0'a çekip paneli söker.
  useEffect(() => {
    if (isOpen || !mounted || edgeDragging) return undefined;
    const id = setTimeout(() => {
      if (isOpenRef.current) return;
      progress.value = 0;
      setMounted(false);
    }, animMs + FORCE_UNMOUNT_SLACK_MS);
    return () => clearTimeout(id);
  }, [isOpen, mounted, edgeDragging, animMs, progress]);

  // Android geri tuşu: açıkken menüyü kapatır (ekranı geri götürmez).
  useEffect(() => {
    if (!isOpen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, close]);

  // Ekran okuyucu odağı menüye (gizli "Menüyü kapat" öğesine) taşınır.
  useEffect(() => {
    if (!isOpen || !mounted) return undefined;
    const id = setTimeout(() => {
      try {
        const node = findNodeHandle(closeRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      } catch {
        // odak taşıma en iyi çabadır
      }
    }, A11Y_FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [isOpen, mounted]);

  // Yalnız açıkken: sola sürükleme içeriği/paneli parmakla birlikte kapatır.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('side-menu-pan')
        .enabled(isOpen)
        .activeOffsetX(-PAN_ACTIVE_OFFSET_X)
        .failOffsetY([-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y])
        .onUpdate((e) => {
          'worklet';
          if (!isOpenSV.value) return;
          progress.value = dragProgress(e.translationX, width);
        })
        .onEnd((e) => {
          'worklet';
          // Dışarıdan kapanış başladıysa (rota/geri tuşu) jest kapanışı ezmesin.
          if (!isOpenSV.value) return;
          if (shouldCloseOnRelease(e.translationX, e.velocityX, width)) {
            scheduleOnRN(close);
          } else {
            progress.value = withTiming(1, { duration: animMs, easing: EASING });
          }
        }),
    [isOpen, width, animMs, close, progress, isOpenSV],
  );

  // Kapalıyken, yalnız sekme köklerinde: sol kenar şeridinde (`EDGE_WIDTH`) BAŞLAYAN sağa sürükleme
  // menüyü parmakla birlikte açar. `hitSlop` şeridi tanıma alanıyla sınırlar; içerikteki dokunuşlar
  // (hamburger, satırlar) etkilenmez — jest yalnız yatay eşik aşılınca etkinleşir.
  const edgePan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('side-menu-edge-pan')
        .enabled(!isOpen && edgeEnabled)
        .hitSlop({ left: 0, width: EDGE_WIDTH })
        .activeOffsetX(PAN_ACTIVE_OFFSET_X)
        .failOffsetX(-PAN_ACTIVE_OFFSET_X)
        .failOffsetY([-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y])
        .onStart(() => {
          'worklet';
          scheduleOnRN(beginEdgeDrag);
        })
        .onUpdate((e) => {
          'worklet';
          if (isOpenSV.value) return;
          progress.value = openDragProgress(e.translationX, width);
        })
        .onEnd((e, success) => {
          'worklet';
          if (isOpenSV.value) return;
          if (success && shouldOpenOnRelease(e.translationX, e.velocityX, width)) {
            scheduleOnRN(open);
          } else {
            progress.value = withTiming(0, { duration: animMs, easing: EASING }, (finished) => {
              'worklet';
              if (finished) scheduleOnRN(unmount);
            });
          }
        })
        .onFinalize(() => {
          'worklet';
          scheduleOnRN(endEdgeDrag);
        }),
    [isOpen, edgeEnabled, width, animMs, open, beginEdgeDrag, endEdgeDrag, unmount, progress, isOpenSV],
  );

  // Panel + içerik tek taşıyıcıda: aynı translateX.
  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX(progress.value, width) }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: contentFadeOpacity(progress.value) }));

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <Animated.View
          testID="side-menu-track"
          style={[styles.track, { left: -width, width: windowWidth + width }, trackStyle]}
        >
          {/* Panel yuvası: menü genişliği kadar yer HEP ayrılır (içerik konumu sabit kalır). */}
          <View style={{ width }}>
            {mounted ? (
              <View
                testID="side-menu"
                style={[styles.panel, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
                // Kapanış animasyonu sürerken (≈250ms) satırlar dokunuşa kapalı: çift basış iki push üretmesin.
                pointerEvents={isOpen ? 'auto' : 'none'}
                accessibilityViewIsModal
                importantForAccessibility="yes"
                onAccessibilityEscape={close}
              >
                {/* Menü açıkken üst bar beyaz panelin üstünde: koyu içerik okunur. */}
                <StatusBar style="dark" />
                {/* Başlık/X yok; ekran okuyucu için gizli kapatma aksiyonu (odak ilk buraya gelir). */}
                <Pressable
                  ref={closeRef}
                  testID="side-menu-a11y-close"
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.shared.sidebar.closeMenu')}
                  onPress={close}
                  style={styles.a11yClose}
                />
                {menu}
              </View>
            ) : null}
          </View>
          {/* Uygulama içeriği (Stack + tab bar). Menü açıkken ekran okuyucudan gizlenir. Kenardan
              açma jesti içeriğin sol şeridinde tanınır. */}
          <GestureDetector gesture={edgePan}>
            <View
              testID="side-menu-content"
              style={styles.content}
              importantForAccessibility={isOpen ? 'no-hide-descendants' : 'auto'}
              accessibilityElementsHidden={isOpen}
            >
              {children}
            </View>
          </GestureDetector>
          {/* Kayan içeriğin üstünde beyaz soluklaştırma; dokununca kapatır. Kapanış sürerken de
              dokunuşu yutar (alttaki ekrana geçmesin). */}
          {mounted ? (
            <Pressable
              testID="side-menu-overlay"
              style={[styles.overlay, { left: width }]}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Animated.View style={[styles.fadeTint, fadeStyle]} pointerEvents="none" />
            </Pressable>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  // left/width çalışma anında (menü + pencere genişliği) verilir.
  track: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  panel: { flex: 1, backgroundColor: colors.surface.elevated },
  content: { flex: 1 },
  overlay: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  fadeTint: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surface.elevated },
  a11yClose: { position: 'absolute', top: 0, left: 0, width: 1, height: 1 },
});
