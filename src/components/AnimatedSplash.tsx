import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * JS splash = YEREL (native) splash'in son karesi. Amaç native→JS geçişinde hiçbir
 * görsel değişiklik olmaması: aynı düz zemin, aynı ikon, aynı boyut, aynı merkez.
 * Sonra tüm katman yumuşakça kaybolur (ikon → wordmark dönüşümü yok: iki farklı
 * en-boy oranlı görsel arasında geçiş yeniden bir "sıçrama" üretir).
 */

// Native splash zemin rengi (app.json `expo-splash-screen.backgroundColor`) VE
// assets/splash-icon-square.png'nin gömülü zemini ile BİREBİR aynı. Palette karşılığı
// yok (primary[500] = #f97316, bu #FE6F13) ve görsel zemini PNG'ye gömülü olduğundan
// değiştirilemez — tek yer, tek sabit. app.json ile birlikte güncellenmeli.
// eslint-disable-next-line no-restricted-syntax -- native splash bg + PNG zemini ile birebir (dikişsizlik)
export const SPLASH_BACKGROUND = '#FE6F13';

/**
 * İkon kutusu (dp/pt) — native splash'in GÖRÜNEN ikonuyla aynı olmalı:
 *  - iOS: storyboard'da `imageWidth: 200` kare UIImageView, kapsayıcı merkezinde
 *    (expo-splash-screen / prebuild-config InterfaceBuilder: centerX/centerY).
 *  - Android 12+: `windowSplashScreenIconBackgroundColor` verilmediği için sistem
 *    "arka plansız ikon" düzenini kullanır; androidx core-splashscreen
 *    `splashscreen_icon_size_no_background` = 288dp (çizilebilir bu kutuya ölçeklenir,
 *    görünen maske dairesi 192dp). Arka planlı düzen (240dp/160dp) bu projede geçerli değil.
 *    Android 11 ve altı aynı core-splashscreen temasını kullanır → aynı 288dp.
 * Görsel (1024x1024) zemini #FE6F13 olduğundan maske kenarı görünmez; oklar görselin
 * ~%50'si → 288dp'de ~145dp, 192dp dairenin içinde.
 */
export const SPLASH_ICON_SIZE_IOS = 200;
export const SPLASH_ICON_SIZE_ANDROID = 288;
export const SPLASH_ICON_SIZE = Platform.select({
  ios: SPLASH_ICON_SIZE_IOS,
  default: SPLASH_ICON_SIZE_ANDROID,
});

// Splash en az bu kadar görünür (token hızlı yüklense bile titreme olmasın).
export const MIN_VISIBLE_MS = 500;
// Çıkış: tüm katman yumuşakça kaybolur.
export const EXIT_FADE_MS = 250;
// Güvenlik ağı: appReady gelmese de splash en geç bu sürede kapanır.
const MAX_VISIBLE_MS = 8000;

const iconSource = require('../../assets/splash-icon-square.png');

interface AnimatedSplashProps {
  /** Uygulama hazır olduğunda (token yüklendi vb.) true olur. */
  appReady: boolean;
  /** Çıkış animasyonu bittiğinde overlay'i kaldırmak için çağrılır. */
  onFinish: () => void;
}

export default function AnimatedSplash({ appReady, onFinish }: AnimatedSplashProps) {
  const reduceMotion = useReducedMotion();
  const rootOpacity = useSharedValue(1);

  const [minElapsed, setMinElapsed] = useState(false);
  const splashHidden = useRef(false);
  const exiting = useRef(false);
  const finished = useRef(false);

  const finishOnce = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  // Minimum görünme süresi (mount'ta bir kez). Beklerken ikon sabit — animasyon yok.
  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Hazır + minimum süre dolduğunda çıkışa geç (bir kez).
  useEffect(() => {
    if (!appReady || !minElapsed || exiting.current) return;
    exiting.current = true;
    if (reduceMotion) {
      rootOpacity.value = 0;
      finishOnce();
      return;
    }
    rootOpacity.value = withTiming(
      0,
      { duration: EXIT_FADE_MS, easing: Easing.out(Easing.quad) },
      (done) => {
        if (done) runOnJS(finishOnce)();
      },
    );
  }, [appReady, minElapsed, reduceMotion, rootOpacity, finishOnce]);

  // Güvenlik ağı: appReady/animasyon ne olursa olsun splash en geç bu süre sonra kapanır.
  useEffect(() => {
    const t = setTimeout(() => {
      rootOpacity.value = 0;
      finishOnce();
    }, MAX_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [rootOpacity, finishOnce]);

  // Overlay boyandıktan sonra native splash'i kapat → beyaz parlama yok.
  const handleLayout = (_e: LayoutChangeEvent) => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {
      /* zaten gizlenmiş olabilir */
    });
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  return (
    <Animated.View
      testID="animated-splash"
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      onLayout={handleLayout}
    >
      <StatusBar style="light" />
      <Image
        testID="animated-splash-icon"
        source={iconSource}
        style={styles.icon}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Ekran merkezi: native splash ile aynı (iOS: kapsayıcı merkezi, Android: pencere merkezi).
  root: {
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: SPLASH_ICON_SIZE,
    height: SPLASH_ICON_SIZE,
  },
});
