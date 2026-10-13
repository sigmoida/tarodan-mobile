import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Tüm `Stack` layout'larının TEK varsayılan seçeneği.
 *
 * - `headerShown: false`: native header HİÇBİR yerde açılmaz; üst bar JS tarafında tek bileşenle
 *   (ScreenHeader / PageShell) çizilir (lint: `tarodan/no-custom-screen-header`).
 * - `animation: 'slide_from_right'`: iç içe `Stack`'ler seçenek MİRAS ETMEZ; her layout bu sabiti
 *   yaymazsa Android'de platform varsayılanı (fade/aşağıdan) kalır, iOS'ta sağdan kayma — yani iki
 *   platformda ve ekranlar arasında farklı geçiş. Layout kendi ek seçeneklerini (contentStyle…)
 *   bunun ÜSTÜNE yazar: `screenOptions={{ ...stackScreenOptions, contentStyle: … }}`.
 * - `scrollEdgeEffects: hidden`: iOS 26 native ekranlar, ekranın ilk ScrollView'ına kendi kenar
 *   efektini ekler; bizim `contentInset`'li yüzen barımızda bu, bar yüksekliğinde gri bir bant
 *   olarak görünüyordu. Kaydırma kenarını JS tarafında `ScrollEdge` çiziyor (tek kaynak).
 */
export const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
} satisfies NativeStackNavigationOptions;
