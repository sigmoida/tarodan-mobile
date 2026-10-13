import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { zIndex } from '@/theme';
import { theme } from '../lib/theme';
import { getGlassView } from '../lib/glass';
import { useKeyboardOverlap } from '../lib/keyboard';
import {
  dismissToast,
  getToastSnapshot,
  markToastPresented,
  registerToastInset,
  registerToastLayer,
  showToast,
  subscribeToast,
  unregisterToastInset,
  unregisterToastLayer,
  updateToastInset,
  type ToastId,
  type ToastItem,
  type ToastKind,
  type ToastOptions,
} from '../lib/toastStore';
import { Icon } from '../icons';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

export type { ToastId, ToastKind, ToastOptions } from '../lib/toastStore';

/**
 * Global toast — web'deki `react-hot-toast`'un karşılığı (`toast(...)`, `toast.success(...)`,
 * `toast.error(...)`, `toast.dismiss(id?)`). Bilgi ve başarı mesajları ile yeniden denenebilir işlem
 * hataları için; onay isteyen ya da kullanıcının bir şey yapması gereken hatalar `appAlert` /
 * `confirm` diyaloğuna gider (CLAUDE.md §14).
 *
 * - Durum modül store'unda (`lib/toastStore`): aynı anda tek toast; aynı mesaj tekrar atılırsa süre
 *   yenilenir (dedupe, `{ id }`); farklı mesaj gelirse eskisi çıkış animasyonuyla kalkar, yenisi girer.
 *   Süreler react-hot-toast varsayılanları: başarı 2 sn, diğerleri 4 sn.
 * - Katman: kökte `<ToastHost />` (app/_layout.tsx) her zaman bağlı. `@/ui` `Modal` ve `AlertDialog`
 *   kendi native pencerelerinde `<ToastLayer />` bağlar; toast'ı EN SON bağlanan katman çizer, böylece
 *   açık modalın altında kalmaz. Katman kapanınca toast alttaki katmanda kesintisiz sürer.
 * - Konum: klavye açıkken klavyenin hemen üstünde; kapalıyken kök katmanda kayıtlı alt engelin
 *   (yüzen sekme çubuğu, PageShell alt çubuğu — `useToastBottomInset`) üstünde, yoksa güvenli alanın.
 */
type ToastFn = ((message: unknown, options?: ToastOptions) => ToastId) & {
  success: (message: unknown, options?: ToastOptions) => ToastId;
  error: (message: unknown, options?: ToastOptions) => ToastId;
  dismiss: (id?: ToastId) => void;
};

export const toast: ToastFn = Object.assign(
  (message: unknown, options?: ToastOptions) => showToast('blank', message, options),
  {
    success: (message: unknown, options?: ToastOptions) => showToast('success', message, options),
    error: (message: unknown, options?: ToastOptions) => showToast('error', message, options),
    dismiss: (id?: ToastId) => dismissToast(id),
  },
);

const { colors, spacing, iconSize, duration, controlHeight } = theme;

/** Kart: tek satırda kontrol yüksekliği (48), iki satırda büyür; köşe yarıçapı sabit (native cam sayı ister). */
const TOAST_MIN_HEIGHT = controlHeight.lg;
const TOAST_RADIUS = TOAST_MIN_HEIGHT / 2;
/** Web: `max-width: min(360px, 100vw - 2rem)` — yan boşluk `spacing[4]` kapsayıcıdan gelir. */
export const TOAST_MAX_WIDTH = 360;
/** Engel (klavye, sekme çubuğu, alt çubuk, güvenli alan) ile toast arasındaki boşluk. */
export const TOAST_GAP = spacing[2];
const ENTER_MS = duration.normal;
const EXIT_MS = duration.fast;
/** Cam olmayan kartın giriş/çıkış kayması (pt). */
const SLIDE = spacing[4];
/** Bu kadar sürüklenirse (ya da hızla fırlatılırsa) toast kapanır. */
const SWIPE_DISMISS = spacing[8];
const SWIPE_VELOCITY = 600;

/** Sürükleme (pt) ya da fırlatma hızı (pt/sn) toast'ı kapatmaya yeter mi. */
export function isSwipeDismiss(dy: number, velocityY: number): boolean {
  return Math.abs(dy) > SWIPE_DISMISS || Math.abs(velocityY) > SWIPE_VELOCITY;
}

/**
 * Toast'ın alt kenarının ekranın altından yüksekliği.
 * - Klavye açık: klavyenin üst kenarı (+ klavyeyle yukarı çıkan engel) + boşluk.
 * - Kapalı: kayıtlı engel (sekme çubuğu / alt çubuk), yoksa güvenli alan altı; + boşluk.
 */
export function toastBottom(params: {
  keyboardOverlap: number;
  safeBottom: number;
  inset: { value: number; followsKeyboard: boolean } | null;
  bottomOffset?: number;
}): number {
  const { keyboardOverlap, safeBottom, inset, bottomOffset } = params;
  if (keyboardOverlap > 0) {
    return keyboardOverlap + (inset?.followsKeyboard ? inset.value : 0) + TOAST_GAP;
  }
  return (bottomOffset ?? inset?.value ?? safeBottom + spacing[2]) + TOAST_GAP;
}

/**
 * Ekranın dibindeki bir engeli kök toast katmanına bildirir (toast onun üstünde durur). `value` =
 * engelin ekranın alt kenarından üst kenarına yüksekliği (güvenli alan dahil); `null` = şu an engel
 * yok (kayıt sırasını korur). En son bağlanan kayıt geçerlidir: yığına itilen ekranın alt çubuğu,
 * altta kalan sekme çubuğunun önüne geçer; ekran kapanınca kayıt da kalkar.
 */
export function useToastBottomInset(value: number | null | undefined, followsKeyboard = false): void {
  const keyRef = useRef<number | null>(null);
  const latest = useRef({ value: value ?? null, followsKeyboard });
  latest.current = { value: value ?? null, followsKeyboard };
  useEffect(() => {
    const key = registerToastInset();
    keyRef.current = key;
    updateToastInset(key, latest.current.value, latest.current.followsKeyboard);
    return () => {
      keyRef.current = null;
      unregisterToastInset(key);
    };
  }, []);
  useEffect(() => {
    if (keyRef.current != null) updateToastInset(keyRef.current, value ?? null, followsKeyboard);
  }, [value, followsKeyboard]);
}

const ICON: Record<ToastKind, React.ReactNode> = {
  blank: null,
  success: <Icon name="check-circle" variant="solid" size={iconSize.md} color={colors.success[500]} />,
  error: <Icon name="x-circle" variant="solid" size={iconSize.md} color={colors.danger[500]} />,
};

const CARD_TEST_ID: Record<ToastKind, string> = {
  blank: 'toast-blank',
  success: 'toast-success',
  error: 'toast-error',
};

export interface ToastLayerProps {
  /**
   * Klavye kapalıyken toast'ın oturacağı engelin yüksekliği (ör. sheet'in alt düğme şeridi).
   * Verilmezse güvenli alanın altı. Kök katman bunun yerine `useToastBottomInset` kayıtlarını kullanır.
   */
  bottomOffset?: number;
}

/**
 * Toast katmanı — konduğu native pencerede (kök, `Modal`, `AlertDialog`, sheet) toast çizer. Birden
 * çok katman bağlıyken yalnız en son bağlanan çizer. Tam ekran, dokunuşu geçiren (`box-none`) bir
 * kapsayıcıdır; pencerenin içeriğinden SONRA (en üstte) konmalı.
 */
export const ToastLayer: React.FC<ToastLayerProps> = ({ bottomOffset }) => (
  <ToastLayerImpl root={false} bottomOffset={bottomOffset} />
);

/** Kök toast katmanı — `app/_layout.tsx`'te BİR KEZ. */
export const ToastHost: React.FC = () => <ToastLayerImpl root />;

const ToastLayerImpl: React.FC<{ root: boolean; bottomOffset?: number }> = ({ root, bottomOffset }) => {
  const [layerId, setLayerId] = useState<number | null>(null);
  useEffect(() => {
    const id = registerToastLayer();
    setLayerId(id);
    return () => unregisterToastLayer(id);
  }, []);

  const snap = useSyncExternalStore(subscribeToast, getToastSnapshot, getToastSnapshot);
  const target = layerId != null && snap.topLayer === layerId ? snap.current : null;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const bottom = toastBottom({
    keyboardOverlap: keyboard.overlap,
    safeBottom: insets.bottom,
    inset: root ? snap.inset : null,
    bottomOffset: root ? undefined : bottomOffset,
  });

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, root && styles.rootLayer]}
      onLayout={keyboard.onLayout}
    >
      <ToastPresenter target={target} bottom={bottom} />
    </View>
  );
};

/**
 * Hedef toast'ı (store'dan, bu katmana düşen) giriş/çıkış animasyonuyla çizer. Çıkış gerçekten
 * oynar: hedef kalkınca kart animasyon bitene dek bağlı kalır; bu arada yeni bir toast geldiyse
 * çıkış bitince o girer. Başka katmanda zaten gösterilmiş toast (katman devri) animasyonsuz gelir.
 */
const ToastPresenter: React.FC<{ target: ToastItem | null; bottom: number }> = ({ target, bottom }) => {
  const [shown, setShown] = useState<ToastItem | null>(null);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  // Cam modülü yalnız bir toast çizilirken sorgulanır (boş katman native modüle dokunmaz).
  const glass = shown ? getGlassView() !== null : false;
  const targetRef = useRef(target);
  targetRef.current = target;
  const exitingRef = useRef(false);

  const finishExit = useCallback(() => {
    exitingRef.current = false;
    setShown(targetRef.current);
  }, []);

  useEffect(() => {
    if (!shown) {
      if (target) setShown(target);
      return;
    }
    if (target && target.id === shown.id) {
      if (target !== shown) setShown(target);
      if (exitingRef.current) {
        // Çıkarken aynı toast geri geldi (ör. katman devri): yarıda kalan çıkışı geri sar.
        exitingRef.current = false;
        progress.value = withTiming(1, { duration: reduceMotion ? 0 : ENTER_MS });
      }
      return;
    }
    if (exitingRef.current) return; // çıkış sürüyor; bitince en son hedef girer
    exitingRef.current = true;
    progress.value = withTiming(0, { duration: EXIT_MS }, (finished) => {
      if (finished) scheduleOnRN(finishExit);
    });
  }, [target, shown, progress, reduceMotion, finishExit]);

  const shownId = shown?.id;
  const shownPresented = shown?.presented ?? false;
  useEffect(() => {
    if (!shownId) return;
    drag.value = 0;
    cancelAnimation(progress);
    progress.value = shownPresented ? 1 : withTiming(1, { duration: ENTER_MS });
    markToastPresented(shownId);
    // Yalnız yeni bir toast çizilmeye başlayınca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownId]);

  const travel = bottom + TOAST_MIN_HEIGHT * 2;
  // Yukarı/aşağı kaydırarak kapatma. PanResponder: her native pencerede (kök, Modal, AlertDialog)
  // ek kök görünüm istemeden çalışır; sürükleme değeri UI thread'indeki stile paylaşılan değerle akar.
  const swipe = useMemo(() => {
    const id = shownId;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        drag.value = g.dy;
      },
      onPanResponderRelease: (_e, g) => {
        if (id && isSwipeDismiss(g.dy, g.vy * 1000)) {
          const dir = g.dy < 0 ? -1 : 1;
          drag.value = withTiming(dir * travel, { duration: EXIT_MS }, (finished) => {
            if (finished) scheduleOnRN(dismissToast, id);
          });
        } else {
          drag.value = withSpring(0);
        }
      },
      onPanResponderTerminate: () => {
        drag.value = withSpring(0);
      },
    });
  }, [drag, shownId, travel]);

  // Native cam, ata opaklığı < 1 iken efektini kaybeder (GlassSurface notu): camda yüzey yalnız
  // kayar, içerik soluklaşır. Hareketi azalt: kayma yok, yalnız opaklık.
  const wrapStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (reduceMotion) {
      return glass ? { transform: [{ translateY: drag.value }] } : { opacity: p, transform: [{ translateY: drag.value }] };
    }
    if (glass) return { transform: [{ translateY: (1 - p) * travel + drag.value }] };
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * SLIDE + drag.value }, { scale: 0.96 + 0.04 * p }],
    };
  });
  const contentStyle = useAnimatedStyle(() => ({ opacity: glass ? progress.value : 1 }));

  if (!shown) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom }, wrapStyle]} testID="toast">
      <View style={styles.swipeArea} testID="toast-swipe" {...swipe.panHandlers}>
        <GlassSurface
          shape="pill"
          size={TOAST_MIN_HEIGHT}
          radius={TOAST_RADIUS}
          style={styles.card}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={shown.message}
          testID={CARD_TEST_ID[shown.kind]}
        >
          <Animated.View style={[styles.row, contentStyle]}>
            {ICON[shown.kind]}
            <Text variant="bodySm" tone="body" numberOfLines={2} style={styles.message}>
              {shown.message}
            </Text>
          </Animated.View>
        </GlassSurface>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rootLayer: {
    zIndex: zIndex.toast,
  },
  wrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    alignItems: 'center',
  },
  swipeArea: {
    maxWidth: TOAST_MAX_WIDTH,
  },
  card: {
    height: 'auto',
    minHeight: TOAST_MIN_HEIGHT,
    maxWidth: TOAST_MAX_WIDTH,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  message: {
    flexShrink: 1,
  },
});

/** YALNIZ TEST: modül durumunu (toast, katmanlar, alt engel kayıtları) sıfırlar. */
export { resetToastStoreForTests as resetToastForTests } from '../lib/toastStore';
