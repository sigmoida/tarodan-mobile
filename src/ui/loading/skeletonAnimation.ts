import { useEffect } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { theme } from '../lib/theme';

/**
 * TÜM iskeletlerin TEK animasyon sürücüsü: tek `Animated.Value`, tek `Animated.loop`, tek
 * "Hareketi azalt" sorgusu/aboneliği. Liste ekranlarında onlarca blok aynı anda bağlanır; blok
 * başına döngü + erişilebilirlik sorgusu gereksiz iş ve zamanlayıcı yüküydü. İlk bağlanan blok
 * döngüyü başlatır, SON ayrılan durdurur (boştayken hiçbir şey çalışmaz).
 *
 * Tür ve süre `theme.loading.skeleton` token'ından (`pulse` | `shimmer` | `none`) — iskelet
 * görünümünü değiştirmek için ekranlara değil yalnız token'a dokunulur:
 *   - `pulse`: `skeletonProgress` 0 → 1 → 0 (ease-in-out); opaklık 1 → `pulseMinOpacity` → 1.
 *   - `shimmer`: `skeletonProgress` 0 → 1 (doğrusal, başa sarar); blok parlama şeridini kendi
 *     genişliği kadar soldan sağa kaydırır (`SkeletonBlock`).
 * "Hareketi azalt" açıkken (ya da `none`) değer 0'da durur: blok sabit zemin rengindedir.
 */
export const skeletonProgress = new Animated.Value(0);

const cfg = () => theme.loading.skeleton;

/** `pulse` opaklığı — tek paylaşılan interpolasyon (blok başına yeni düğüm yok). */
export const skeletonPulseOpacity = skeletonProgress.interpolate({
  inputRange: [0, 1],
  outputRange: [1, theme.loading.skeleton.pulseMinOpacity],
});

let mounted = 0;
let reduceMotion = false;
let loop: Animated.CompositeAnimation | null = null;
let motionSub: { remove?: () => void } | undefined;
let generation = 0;

function startLoop() {
  const { animation, duration } = cfg();
  if (loop || reduceMotion || animation === 'none') return;
  if (animation === 'shimmer') {
    loop = Animated.loop(
      Animated.timing(skeletonProgress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );
  } else {
    const half = duration / 2;
    loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonProgress, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonProgress, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
  }
  loop.start();
}

function stopLoop() {
  loop?.stop();
  loop = null;
  skeletonProgress.setValue(0);
}

function applyReduceMotion(value: boolean) {
  reduceMotion = value;
  if (mounted === 0) return;
  if (value) stopLoop();
  else startLoop();
}

/** İskelet bloğu bağlanınca çağrılır; dönen fonksiyon ayrılırken çağrılır. */
export function acquireSkeletonMotion(): () => void {
  mounted += 1;
  if (mounted === 1) {
    const gen = ++generation;
    startLoop();
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => gen === generation && mounted > 0 && applyReduceMotion(!!v))
      .catch(() => undefined);
    motionSub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) =>
      applyReduceMotion(!!v),
    );
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mounted -= 1;
    if (mounted === 0) {
      generation += 1;
      stopLoop();
      motionSub?.remove?.();
      motionSub = undefined;
      reduceMotion = false;
    }
  };
}

export interface SkeletonAnimation {
  /** Etkin tür (token). */
  kind: 'pulse' | 'shimmer' | 'none';
  /** Paylaşılan ilerleme (0..1) — `shimmer` şeridi bundan türetilir. */
  progress: Animated.Value;
  /** `pulse` için bloğa verilecek opaklık; diğer türlerde `undefined`. */
  opacity: Animated.AnimatedInterpolation<number> | undefined;
}

/**
 * Bir iskelet bloğunu ortak sürücüye bağlar (bağlıyken döngü çalışır). Yalnız `SkeletonBlock`
 * kullanır; yeni bir iskelet yapı taşı bloğu kendisi çizmez, `SkeletonBlock`'ları dizer.
 */
export function useSkeletonAnimation(): SkeletonAnimation {
  useEffect(() => acquireSkeletonMotion(), []);
  const kind = cfg().animation;
  return {
    kind,
    progress: skeletonProgress,
    opacity: kind === 'pulse' ? skeletonPulseOpacity : undefined,
  };
}
