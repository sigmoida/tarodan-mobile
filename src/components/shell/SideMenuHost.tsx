import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
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
import { useTranslation } from 'react-i18next';
import { HeaderIconButton, Text, theme } from '@/ui';
import { zIndex } from '@/theme';
import { useSideMenu } from './SideMenuContext';

const { colors, spacing, duration } = theme;

/** Menü genişliği: ekranın %80'i, en fazla 340pt (tablet/geniş telefonda). */
export const SIDE_MENU_WIDTH_RATIO = 0.8;
export const SIDE_MENU_MAX_WIDTH = 340;

/** Sola sürüklemede menü, genişliğin bu kadarından fazla kapanmışsa (ya da hızlıysa) kapanır. */
const CLOSE_DRAG_FRACTION = 0.3;
/** pt/sn — bu hızdan hızlı sola fırlatma menüyü kapatır. */
const CLOSE_FLING_VELOCITY = 600;
/** Sürükleme, yatayda bu kadar hareketten sonra başlar (dikey kaydırma/dokunuşlar bozulmasın). */
const PAN_ACTIVE_OFFSET_X = 12;
const PAN_FAIL_OFFSET_Y = 16;
/** Ekran okuyucu odağını menüye taşımadan önce animasyonun başlamasını bekle (ms). */
const A11Y_FOCUS_DELAY_MS = 350;

const EASING = Easing.bezier(0.4, 0, 0.2, 1);

export function sideMenuWidth(windowWidth: number): number {
  return Math.min(Math.round(windowWidth * SIDE_MENU_WIDTH_RATIO), SIDE_MENU_MAX_WIDTH);
}

/**
 * Yan menü kabuğu — kök layout'ta TEK kez (ToastHost gibi). Sol kenardan kayan beyaz panel,
 * sağda karartılmış örtü; örtüye dokunma / sola kaydırma / Android geri tuşu kapatır. Animasyon
 * UI thread'inde (Reanimated, ~250ms); "hareketi azalt" açıkken anında. İçerik (`children`)
 * yalnız menü açıkken bağlanır → kapalıyken sorgu/abonelik yok.
 */
export function SideMenuHost({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSideMenu();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const width = sideMenuWidth(windowWidth);
  const animMs = reduceMotion ? 0 : duration.normal;

  // 0 = kapalı, 1 = açık. Panel konumu ve örtü opaklığı bundan türer.
  const progress = useSharedValue(0);
  // Kapanış animasyonu bitene dek bağlı kalır.
  const [mounted, setMounted] = useState(false);
  const titleRef = useRef<View>(null);

  // Kapanış animasyonu bitince söker — ama bu arada yeniden açıldıysa dokunmaz.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const unmount = useCallback(() => {
    if (!isOpenRef.current) setMounted(false);
  }, []);

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

  // Android geri tuşu: açıkken menüyü kapatır (ekranı geri götürmez).
  useEffect(() => {
    if (!isOpen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, close]);

  // Ekran okuyucu odağı menüye taşınır.
  useEffect(() => {
    if (!isOpen || !mounted) return undefined;
    const id = setTimeout(() => {
      try {
        const node = findNodeHandle(titleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      } catch {
        // odak taşıma en iyi çabadır
      }
    }, A11Y_FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [isOpen, mounted]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('side-menu-pan')
        .activeOffsetX(-PAN_ACTIVE_OFFSET_X)
        .failOffsetY([-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y])
        .onUpdate((e) => {
          'worklet';
          progress.value = Math.min(1, Math.max(0, 1 + e.translationX / width));
        })
        .onEnd((e) => {
          'worklet';
          if (e.translationX < -width * CLOSE_DRAG_FRACTION || e.velocityX < -CLOSE_FLING_VELOCITY) {
            scheduleOnRN(close);
          } else {
            progress.value = withTiming(1, { duration: animMs, easing: EASING });
          }
        }),
    [width, animMs, close, progress],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * width }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        accessibilityViewIsModal
        importantForAccessibility="yes"
        testID="side-menu-root"
      >
        {/* Menü açıkken üst bar da örtünün altında: koyu içerik beyaz panelin üstünde okunur. */}
        <StatusBar style="dark" />
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable
            testID="side-menu-overlay"
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        <Animated.View
          testID="side-menu"
          style={[
            styles.panel,
            { width, paddingTop: insets.top, paddingBottom: insets.bottom },
            panelStyle,
          ]}
        >
          <View style={styles.header}>
            <View ref={titleRef} accessible accessibilityRole="header" style={styles.title}>
              <Text variant="h3" numberOfLines={1}>
                {t('nav.menu')}
              </Text>
            </View>
            <HeaderIconButton
              tone="muted"
              icon="x-mark"
              label={t('common.close')}
              testID="side-menu-close"
              onPress={close}
            />
          </View>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: zIndex.overlay,
    elevation: zIndex.overlay,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.black50,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: theme.headerHeight,
    paddingLeft: spacing[4],
    paddingRight: spacing[1.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { flex: 1 },
});
