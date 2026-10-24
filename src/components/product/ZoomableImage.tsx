import { StyleSheet, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Side (pt) of the square the photo is fitted into: the page width, but never taller than the page
 * (landscape tablets, unfolded foldables), so the photo is not cropped.
 */
export function zoomImageSide(pageWidth: number, areaHeight: number): number {
  return Math.max(0, Math.min(pageWidth, areaHeight));
}

/**
 * Tam ekran görüntüleyici sayfası: pinch + double-tap zoom, zoom'luyken pan.
 * Native ScrollView zoom'u Android'de çalışmadığı için gesture-handler/reanimated ile
 * iki platformda da aynı davranır. Zoom'luyken dış yatay sayfalama kaymasın diye
 * onZoomChange ile üst bileşene haber verir.
 */
export default function ZoomableImage({
  uri,
  zoomed,
  onZoomChange,
  areaHeight: areaHeightProp,
}: {
  uri: string;
  /** Sayfanın gerçek yüksekliği (görüntüleyicide küçük resim şeridi düşülmüş) — çift dokunma merkezi için. */
  areaHeight?: number;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}) {
  // Window size from the hook (not module-level `Dimensions.get`): rotation, fold/unfold and split
  // view resize the page.
  const { width, height: windowHeight } = useWindowDimensions();
  const areaHeight = areaHeightProp ?? windowHeight;
  const side = zoomImageSide(width, areaHeight);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(onZoomChange)(false);
      } else {
        const s = DOUBLE_TAP_SCALE;
        // Dokunulan nokta merkezde kalacak şekilde kaydır; görsel sınırları içinde tut
        const maxTx = (side * (s - 1)) / 2;
        const maxTy = (side * (s - 1)) / 2; // görsel side x side boyutunda
        const nextTx = clamp((width / 2 - e.x) * (s - 1), -maxTx, maxTx);
        const nextTy = clamp((areaHeight / 2 - e.y) * (s - 1), -maxTy, maxTy);
        scale.value = withTiming(s);
        tx.value = withTiming(nextTx);
        ty.value = withTiming(nextTy);
        savedScale.value = s;
        savedTx.value = nextTx;
        savedTy.value = nextTy;
        runOnJS(onZoomChange)(true);
      }
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 1, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const maxTx = (side * (scale.value - 1)) / 2;
      const maxTy = (side * (scale.value - 1)) / 2;
      tx.value = clamp(tx.value, -maxTx, maxTx);
      ty.value = clamp(ty.value, -maxTy, maxTy);
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(onZoomChange)(scale.value > 1);
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      const maxTx = (side * (scale.value - 1)) / 2;
      const maxTy = (side * (scale.value - 1)) / 2;
      tx.value = clamp(savedTx.value + e.translationX, -maxTx, maxTx);
      ty.value = clamp(savedTy.value + e.translationY, -maxTy, maxTy);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.page, { width }]}>
        <Animated.View style={animatedStyle}>
          <AppImage source={uri} variant="detail" style={{ width: side, height: side }} contentFit="contain" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
