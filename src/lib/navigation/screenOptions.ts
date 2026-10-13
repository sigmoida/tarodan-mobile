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
 */
export const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
} satisfies NativeStackNavigationOptions;
