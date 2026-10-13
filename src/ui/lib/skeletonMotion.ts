import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** Web `animate-pulse`: 2 sn'lik döngüde opaklık 1 → 0.5 → 1. */
const PULSE_HALF_MS = 1000;

/**
 * Tüm iskeletler için TEK paylaşılan nabız: tek `Animated.Value`, tek `Animated.loop`, tek
 * "Hareketi azalt" sorgusu/aboneliği. Liste ekranlarında onlarca Skeleton aynı anda bağlanır;
 * örnek başına döngü + erişilebilirlik sorgusu gereksiz iş ve zamanlayıcı yüküydü. İlk bağlanan
 * örnek döngüyü başlatır, SON ayrılan durdurur (boştayken hiçbir şey çalışmaz).
 */
export const skeletonOpacity = new Animated.Value(1);

let mounted = 0;
let reduceMotion = false;
let loop: Animated.CompositeAnimation | null = null;
let motionSub: { remove?: () => void } | undefined;
let generation = 0;

function startLoop() {
  if (loop || reduceMotion) return;
  loop = Animated.loop(
    Animated.sequence([
      Animated.timing(skeletonOpacity, {
        toValue: 0.5,
        duration: PULSE_HALF_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(skeletonOpacity, {
        toValue: 1,
        duration: PULSE_HALF_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  );
  loop.start();
}

function stopLoop() {
  loop?.stop();
  loop = null;
  skeletonOpacity.setValue(1);
}

function applyReduceMotion(value: boolean) {
  reduceMotion = value;
  if (mounted === 0) return;
  if (value) stopLoop();
  else startLoop();
}

/** Skeleton bağlanınca çağrılır; dönen fonksiyon ayrılırken çağrılır. */
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
