import { Platform, type ScrollViewProps } from 'react-native';
import { useHeaderTopInset } from '@/ui';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';

/**
 * Ana sayfa yüzen üst barı — yerleşim ve animasyon yardımcıları (saf; jest'te düz fonksiyon).
 * Bar içeriğin ÜSTÜNDE yüzer (absolute); liste içeriği altından kayar. Bu yüzden liste üstten bar
 * yüksekliği kadar boşlukla başlamalı: `useFloatingBarInset` + `floatingBarScrollProps`.
 */

/** Daralınca arama alanının yukarı (negatif) ve sola (negatif) kayma payı (pt). */
export const SEARCH_HIDE_TRANSLATE_Y = -APP_SHELL_BAR_HEIGHT / 2;
export const SEARCH_HIDE_TRANSLATE_X = -24;

/** Yüzen barın kapladığı yükseklik: güvenli alan üstü + bar satırı. */
export function useFloatingBarInset(): number {
  return useHeaderTopInset() + APP_SHELL_BAR_HEIGHT;
}

/**
 * Liste üst boşluğu — platforma göre:
 * - iOS: `contentInset.top` (+ başlangıç ofseti -inset). Pull-to-refresh göstergesi barın ALTINDA
 *   açılır, kaydırma çubuğu da bar altından başlar. Dinlenme ofseti -inset olur
 *   (`useTabBarScrollHandler` ofseti inset'le normalize eder).
 * - Android: içerik `paddingTop` (inset yok); `RefreshControl.progressViewOffset` ayrıca verilir.
 */
export function floatingBarScrollProps(inset: number, os: string = Platform.OS): Partial<ScrollViewProps> {
  if (os === 'ios') {
    return {
      contentInset: { top: inset },
      contentOffset: { x: 0, y: -inset },
      scrollIndicatorInsets: { top: inset },
      automaticallyAdjustContentInsets: false,
      contentInsetAdjustmentBehavior: 'never',
    };
  }
  return { contentContainerStyle: { paddingTop: inset } };
}

/**
 * Arama alanının daralma stili (`progress`: 0 görünür, 1 gizli) — SAF worklet: yukarı + sola kayarak
 * solar. Cam butonlar bunun dışındadır (yerinde kalır, opacity almaz).
 */
export function searchHideStyle(progress: number) {
  'worklet';
  return {
    opacity: 1 - progress,
    transform: [
      { translateY: progress * SEARCH_HIDE_TRANSLATE_Y },
      { translateX: progress * SEARCH_HIDE_TRANSLATE_X },
    ],
  };
}

/** Bar zemininin (beyaz + alt çizgi) opaklığı: liste başında dolu, daralınca kaybolur — SAF worklet. */
export function barBackgroundOpacity(progress: number): number {
  'worklet';
  return 1 - progress;
}
