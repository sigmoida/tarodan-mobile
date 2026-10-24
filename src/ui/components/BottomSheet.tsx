import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { keyboardBottomInset, useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { theme } from '../lib/theme';
import { useHeaderTopInset } from '../lib/header';
import { logger, safeError } from '@/services/logger';
import { MODAL_CLOSE_DELAY_MS, MODAL_DISMISS_TIMEOUT_MS } from '../lib/modal-timing';
import { useModalPresence } from '../lib/modalPresence';
import {
  keyboardResizedWindow,
  progressAfterDrag,
  revealScrollOffset,
  sheetBottomPadding,
  sheetDragOffset,
  sheetLayout,
  sheetTranslateY,
  shouldCloseSheetOnRelease,
  type BottomSheetSize,
} from '../lib/sheetMotion';
import { SheetHeader } from './SheetHeader';
import { ToastLayer } from './Toast';

export type { BottomSheetSize };

export interface BottomSheetProps {
  isOpen: boolean;
  /** Kapatma isteği (X, arka plan, geri tuşu, aşağı sürükleme). `isOpen`'ı çağıran kapatır. */
  onClose: () => void;
  /**
   * Sheet TAMAMEN kapandıktan sonra (kapanış animasyonu bitti, native Modal söküldü; iOS'ta
   * `onDismiss`) bir kez çağrılır. appAlert / başka Modal / galeri gibi ikinci bir native sunum
   * buradan açılır (src/ui/CLAUDE.md › iOS modal rule). Sheet içinden: `useBottomSheet().runAfterClose`.
   */
  onClosed?: () => void;
  /** Başlık (SheetHeader: solda, kapat X sağda). Verilmezse yalnız tutamaç çizilir. */
  title?: string;
  closeLabel?: string;
  /** `fit` (varsayılan) içerik kadar; `large` ekranın ~%92'si (filtre, uzun liste). */
  size?: BottomSheetSize;
  /**
   * Gövde ScrollView'a sarılır (varsayılan). Çağıran kendi sanal listesini (FlatList) veriyorsa
   * `false`: gövde düz View olur, listeye kalan yüksekliği o verir.
   */
  scrollable?: boolean;
  /** Gövdenin iç boşluğunu sıfırlar (satırlarını kenardan kenara çizen listeler). */
  flushBody?: boolean;
  /** Arka plana dokununca kapanır (varsayılan açık). */
  closeOnBackdrop?: boolean;
  /** Tutamaç/başlıktan aşağı sürükleyerek kapatma (varsayılan açık). */
  dragToClose?: boolean;
  /**
   * Gövdenin DIŞINDA sabit alt çubuk (düğmeler için `ButtonRow`): üstte ince ayraç, beyaz
   * zemin, alt boşluk güvenli alan kadar; klavye açılınca klavyenin hemen üstüne çıkar.
   */
  footer?: React.ReactNode;
  /** Gövde içerik kabının ek stili (ScrollView `contentContainerStyle` / düz View). */
  bodyStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Köke verilir; `${testID}-close`, `${testID}-backdrop`, `${testID}-handle`, `${testID}-footer`. */
  testID?: string;
}

/** Sheet içinden kapatma / kapanış-sonrası işlem (`ActionSheet` satırları, menüler). */
export interface BottomSheetController {
  /** Kapatma isteği (`onClose`). */
  close: () => void;
  /**
   * `fn`'i kuyruğa koyar ve kapatma ister; `fn` sheet TAMAMEN kapandıktan sonra çalışır
   * (iOS: native Modal `onDismiss`). Eylem appAlert / başka Modal / yönlendirme açabilir.
   * Aynı açılışta yalnız İLK çağrı geçerlidir (çift dokunuş eylemi iki kez çalıştırmaz); sheet
   * `isOpen` çevrilmeden sökülürse iş yine çalışır.
   */
  runAfterClose: (fn: () => void) => void;
}

const BottomSheetContext = createContext<BottomSheetController | null>(null);

/** En yakın `BottomSheet`'in denetleyicisi (sheet dışında: kapatma no-op, `runAfterClose` hemen çalıştırır). */
export function useBottomSheet(): BottomSheetController {
  return useContext(BottomSheetContext) ?? FALLBACK_CONTROLLER;
}

const FALLBACK_CONTROLLER: BottomSheetController = {
  close: () => undefined,
  runAfterClose: (fn) => fn(),
};

const { colors, spacing, duration, radiusRole } = theme;

const EASING = Easing.bezier(0.4, 0, 0.2, 1);

/** Kapanış-sonrası işleri sırayla çalıştırır; biri hata atarsa diğerleri yine çalışır. */
function runQueued(queue: ReadonlyArray<() => void>): void {
  for (const fn of queue) {
    try {
      fn();
    } catch (err) {
      logger.error('[BottomSheet] runAfterClose işi hata verdi', { err: safeError(err) });
    }
  }
}
/** Kapanış animasyonu bitiş geri çağrısına güvenmeden, süre dolunca zorla sökmek için pay (ms). */
const FORCE_UNMOUNT_SLACK_MS = 100;
/** Sürükleme, dikeyde bu kadar hareketten sonra başlar (dokunuşlar/X bozulmasın). */
const PAN_ACTIVE_OFFSET_Y = 8;
const PAN_FAIL_OFFSET_X = 24;
/** Sürükleyerek kapatma istendikten sonra sheet hâlâ açıksa (çağıran kapatmadı) geri yaylanır (ms). */
const DRAG_CLOSE_CONFIRM_MS = 150;
/** Odaklanan alanın görünür alanın kenarından en az bu kadar içeride durması (pt). */
const REVEAL_MARGIN = spacing[4];
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 4;

/**
 * Alttan açılan panel — uygulamadaki TEK sheet primitive'i (`SelectSheet`, `ActionSheet` bunun
 * üstünde). `enableScreens(false)` yüzünden native formSheet sunumu yok; bu yüzden JS sheet:
 * RN `Modal` (saydam, status/gezinti çubuğu saydam, kendi animasyonu yok) + reanimated ile UI
 * thread'inde alttan kayma + arka plan karartma, gesture-handler ile tutamaç/başlıktan aşağı
 * sürükleyerek kapatma (gövde kaydırmasıyla çakışmaz). Android geri tuşu kapatır
 * (`onRequestClose`), "hareketi azalt" açıkken anında.
 *
 * İçerik yalnız açıkken bağlıdır: kapanış animasyonu bitince (emniyet: süre + pay) sökülür ve
 * native Modal kapanır; ardından `onClosed` ve `runAfterClose` kuyruğu çalışır.
 *
 * Klavye: Modal kenardan kenara olduğu için Android'de `adjustResize` yüzeyi küçültmez
 * (FullScreenGate ile aynı) — sheet klavye yüksekliği kadar kaldırılır, gövde küçülür, footer
 * klavyenin hemen üstünde kalır. Pencere yine de küçüldüyse (resize) kaldırma uygulanmaz
 * (çift kaydırma olmaz).
 */
export function BottomSheet(props: BottomSheetProps) {
  const { isOpen, onClosed } = props;
  // Açık ya da kapanış animasyonu sürüyor: Modal görünür ve içerik bağlı.
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);
  // Çevrimdışı diyaloğu gibi kendiliğinden açılan diyaloglar bu sırada ertelenir (iOS modal donması).
  useModalPresence(mounted);

  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  // Bu açılışın kapanış bildirimi henüz verilmedi mi + kapanış sonrası kuyruğu.
  const closedPendingRef = useRef(false);
  const queueRef = useRef<Array<() => void>>([]);
  // Bu açılışta bir kapanış-sonrası iş seçildi: sonraki seçimler yok sayılır (çift dokunuş
  // yıkıcı eylemi iki kez çalıştırmasın). Yeniden açılınca sıfırlanır.
  const choiceMadeRef = useRef(false);

  useEffect(() => {
    if (mounted) closedPendingRef.current = true;
  }, [mounted]);

  // Yeniden açıldıysa önceki kapanışa bağlı eylemler artık geçersiz.
  useEffect(() => {
    if (!isOpen) return;
    queueRef.current = [];
    choiceMadeRef.current = false;
  }, [isOpen]);

  const fireClosed = useCallback(() => {
    if (!closedPendingRef.current || isOpenRef.current) return;
    closedPendingRef.current = false;
    const queue = queueRef.current;
    queueRef.current = [];
    runQueued([...(onClosedRef.current ? [onClosedRef.current] : []), ...queue]);
  }, []);

  // `isOpen` çevrilmeden doğrudan sökülürse (koşullu render, PageShell loading/error) kuyruktaki
  // işler kaybolmasın: native Modal'ın kapanmasına pay bırakıp çalıştır (iOS donma kuralı).
  useEffect(
    () => () => {
      const queue = queueRef.current;
      queueRef.current = [];
      if (queue.length === 0) return;
      setTimeout(() => runQueued(queue), Platform.OS === 'ios' ? MODAL_CLOSE_DELAY_MS : 0);
    },
    [],
  );

  // Native Modal kapandı: iOS'ta asıl sinyal `onDismiss` (üst sınır yedekli); Android'de
  // `onDismiss` yok — söküm işlendikten sonraki ilk tick.
  useEffect(() => {
    if (mounted || !closedPendingRef.current) return undefined;
    const id = setTimeout(fireClosed, Platform.OS === 'ios' ? MODAL_DISMISS_TIMEOUT_MS : 0);
    return () => clearTimeout(id);
  }, [mounted, fireClosed]);

  // Sheet hiç açık değilken çağrılırsa kuyruğa koymadan hemen çalışır.
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;
  const controller = useMemo<BottomSheetController>(
    () => ({
      close: () => onCloseRef.current(),
      runAfterClose: (fn) => {
        if (!mountedRef.current) {
          runQueued([fn]);
          return;
        }
        // Aynı açılışta ilk seçim kazanır (yeniden giriş koruması).
        if (choiceMadeRef.current) return;
        choiceMadeRef.current = true;
        queueRef.current.push(fn);
        onCloseRef.current();
      },
    }),
    [],
  );

  const onHidden = useCallback(() => {
    if (!isOpenRef.current) setMounted(false);
  }, []);

  return (
    <RNModal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={props.onClose}
      onDismiss={fireClosed}
    >
      {mounted ? (
        <BottomSheetContext.Provider value={controller}>
          <SheetSurface {...props} onHidden={onHidden} />
        </BottomSheetContext.Provider>
      ) : null}
    </RNModal>
  );
}

interface SheetSurfaceProps extends BottomSheetProps {
  onHidden: () => void;
}

/** Açıkken bağlı yüzey: klavye/ölçü/jest/animasyon yalnız burada (kapalı sheet maliyetsiz). */
function SheetSurface({
  isOpen,
  onClose,
  onHidden,
  title,
  closeLabel,
  size = 'fit',
  scrollable = true,
  flushBody = false,
  closeOnBackdrop = true,
  dragToClose = true,
  footer,
  bodyStyle,
  children,
  testID = 'bottom-sheet',
}: SheetSurfaceProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = useHeaderTopInset();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const animMs = reduceMotion ? 0 : duration.normal;
  const resolvedCloseLabel = closeLabel ?? t('common.close');

  // 0 = gizli (ekranın altında), 1 = açık. Sürükleme ayrı tutulur (bırakınca geri yaylanır).
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  // Ölçülene dek pencere yüksekliği: ilk karede ekran dışında.
  const sheetHeight = useSharedValue(windowHeight);
  const isOpenSV = useSharedValue(isOpen);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  // Jest ve satır içi `onClose` (her renderda yeni fonksiyon) jesti yeniden kurmasın.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const requestClose = useCallback(() => onCloseRef.current(), []);

  useLayoutEffect(() => {
    isOpenSV.value = isOpen;
  }, [isOpen, isOpenSV]);

  useEffect(() => {
    if (isOpen) {
      progress.value = withTiming(1, { duration: animMs, easing: EASING });
    } else {
      progress.value = withTiming(0, { duration: animMs, easing: EASING }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onHidden);
      });
    }
  }, [isOpen, animMs, progress, onHidden]);

  // Emniyet: kapanış animasyonu kesilirse (`finished=false`) bile sheet takılı kalmasın.
  useEffect(() => {
    if (isOpen) return undefined;
    const id = setTimeout(() => {
      if (isOpenRef.current) return;
      progress.value = 0;
      onHidden();
    }, animMs + FORCE_UNMOUNT_SLACK_MS);
    return () => clearTimeout(id);
  }, [isOpen, animMs, progress, onHidden]);

  // Klavye: kenardan kenara Modal'da yüzey küçülmez → sheet klavye kadar kaldırılır. Android
  // pencereyi yine de küçülttüyse (resize) kaldırma uygulanmaz (çift kaydırma olmasın).
  const keyboardHeight = useKeyboardHeight();
  const [rootHeight, setRootHeight] = useState(0);
  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setRootHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);
  const containerHeight = rootHeight || windowHeight;
  const keyboardOpen = keyboardHeight > 0;
  const resizedByOs = keyboardResizedWindow(Platform.OS, keyboardHeight, rootHeight, windowHeight);
  const keyboardLift = keyboardOpen && !resizedByOs ? keyboardBottomInset(keyboardHeight, insets.bottom) : 0;
  const layout = sheetLayout(size, containerHeight, topInset, keyboardLift);
  const bottomPad = sheetBottomPadding(insets.bottom, keyboardOpen);

  // Alt çubuk yüksekliği (güvenli alan / klavye payı dahil): toast onun üstünde dursun.
  const [footerHeight, setFooterHeight] = useState(0);
  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setFooterHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  const onSheetLayout = useCallback(
    (e: LayoutChangeEvent) => {
      sheetHeight.value = e.nativeEvent.layout.height;
    },
    [sheetHeight],
  );

  // Sürükleyerek kapatma: çağıran kapatmazsa (koruma / no-op) sheet yarıda takılı kalmasın.
  const animMsRef = useRef(animMs);
  animMsRef.current = animMs;
  const dragCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(dragCloseTimer.current), []);
  const requestDragClose = useCallback(() => {
    onCloseRef.current();
    clearTimeout(dragCloseTimer.current);
    dragCloseTimer.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      progress.value = withTiming(1, { duration: animMsRef.current, easing: EASING });
    }, DRAG_CLOSE_CONFIRM_MS);
  }, [progress]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(`${testID}-pan`)
        .enabled(dragToClose && isOpen)
        .activeOffsetY(PAN_ACTIVE_OFFSET_Y)
        .failOffsetX([-PAN_FAIL_OFFSET_X, PAN_FAIL_OFFSET_X])
        .onUpdate((e) => {
          'worklet';
          if (!isOpenSV.value) return;
          drag.value = sheetDragOffset(e.translationY);
        })
        .onEnd((e) => {
          'worklet';
          if (!isOpenSV.value) return;
          if (shouldCloseSheetOnRelease(e.translationY, e.velocityY, sheetHeight.value)) {
            // Kapanış kaldığı yerden devam etsin (zıplama olmasın).
            progress.value = progressAfterDrag(drag.value, sheetHeight.value);
            drag.value = 0;
            scheduleOnRN(requestDragClose);
          } else {
            drag.value = withTiming(0, { duration: animMs, easing: EASING });
          }
        }),
    [testID, dragToClose, isOpen, isOpenSV, drag, sheetHeight, progress, requestDragClose, animMs],
  );

  // Klavye açılınca gövde küçülür: odaklı alan (ör. filtre fiyat alanı) footer/klavye arkasında
  // kalmasın — görünür alana kaydırılır. Platformdan bağımsız (iOS + Android).
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const viewportRef = useRef(0);
  const revealFocusedInput = useCallback(() => {
    const scroll = scrollRef.current;
    const input = TextInput.State.currentlyFocusedInput?.();
    // Fabric'te `measureLayout` host örneğine göre ölçer (tipte yok ama RN ScrollView'de var).
    const inner = (scroll as unknown as { getInnerViewRef?: () => unknown } | null)?.getInnerViewRef?.();
    if (!scroll || !input || !inner || viewportRef.current <= 0) return;
    try {
      input.measureLayout(
        inner as unknown as number,
        (_x: number, y: number, _w: number, h: number) => {
          const target = revealScrollOffset(y, h, scrollYRef.current, viewportRef.current, REVEAL_MARGIN);
          if (target !== null) scroll.scrollTo({ y: target, animated: true });
        },
        () => undefined,
      );
    } catch {
      // odak alanı sheet gövdesinde değil
    }
  }, []);
  const onBodyLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportRef.current = e.nativeEvent.layout.height;
      if (keyboardOpen) revealFocusedInput();
    },
    [keyboardOpen, revealFocusedInput],
  );
  const onBodyScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY(progress.value, sheetHeight.value, drag.value) }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const bodyContentStyle = [
    !flushBody && styles.bodyPadding,
    !footer && { paddingBottom: bottomPad },
    bodyStyle,
  ];
  const bodyFrame = size === 'large' ? styles.bodyFill : styles.bodyFit;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <View
        style={styles.root}
        onLayout={onRootLayout}
        // Kapanış sürerken dokunuşa kapalı: çift basış iki eylem üretmesin.
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        <Pressable
          testID={`${testID}-backdrop`}
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdrop ? requestClose : undefined}
          accessible={false}
          importantForAccessibility="no"
        />
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          onLayout={onSheetLayout}
          style={[
            styles.sheet,
            layout.height !== undefined
              ? { maxHeight: layout.maxHeight, marginBottom: keyboardLift, height: layout.height }
              : { maxHeight: layout.maxHeight, marginBottom: keyboardLift },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View testID={`${testID}-handle`} collapsable={false}>
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>
              {title ? (
                <SheetHeader
                  title={title}
                  onClose={requestClose}
                  closeLabel={resolvedCloseLabel}
                  closeTestID={`${testID}-close`}
                />
              ) : null}
            </View>
          </GestureDetector>
          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              onLayout={onBodyLayout}
              onScroll={onBodyScroll}
              scrollEventThrottle={32}
              style={bodyFrame}
              contentContainerStyle={bodyContentStyle}
              keyboardShouldPersistTaps="handled"
              testID={`${testID}-body`}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[bodyFrame, bodyContentStyle]} testID={`${testID}-body`}>
              {children}
            </View>
          )}
          {footer ? (
            <View
              testID={`${testID}-footer`}
              style={[styles.footer, { paddingBottom: bottomPad }]}
              onLayout={onFooterLayout}
            >
              {footer}
            </View>
          ) : null}
          {/* Toast sheet yüzeyinin İÇİNDE, alt çubuğun üstünde (kök host sheet'in native penceresinin
              ALTINDA kalır). Sheet klavyeye göre zaten kalkıyor: katman klavyeyi ayrıca saymaz.
              Yüzeyin içinde olduğu için ekran okuyucu ve otomasyon da görür (accessibilityViewIsModal). */}
          <ToastLayer bottomOffset={footer ? footerHeight : undefined} keyboardAware={false} />
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay.black50 },
  sheet: {
    // Spans the window on every width (tablets included), like the rest of the edge-to-edge layout.
    width: '100%',
    backgroundColor: colors.surface.elevated,
    borderTopLeftRadius: radiusRole.sheet,
    borderTopRightRadius: radiusRole.sheet,
    overflow: 'hidden',
    ...theme.shadow.elevated,
  },
  grabberWrap: { alignItems: 'center', paddingTop: spacing[2] },
  grabber: {
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: theme.radius.full,
    backgroundColor: colors.gray[300],
  },
  // `fit`: içerik kadar, üst sınırı aşarsa küçülüp kayar. `large`: kalan yüksekliği doldurur.
  bodyFit: { flexGrow: 0, flexShrink: 1 },
  bodyFill: { flex: 1 },
  bodyPadding: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
});
