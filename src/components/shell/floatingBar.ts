import { Platform, type ScrollViewProps } from 'react-native';
import { useHeaderBarInset } from '@/ui';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';

/**
 * Ana sayfa yüzen üst barı — yerleşim ve animasyon yardımcıları (saf; jest'te düz fonksiyon).
 * Bar içeriğin ÜSTÜNDE yüzer (absolute); liste içeriği altından kayar. Bu yüzden liste üstten bar
 * yüksekliği kadar boşlukla başlamalı: `useFloatingBarInset` + `floatingBarScrollProps`.
 */

/** Daralınca arama alanının yukarı (negatif) ve sola (negatif) kayma payı (pt). */
export const SEARCH_HIDE_TRANSLATE_Y = -APP_SHELL_BAR_HEIGHT / 2;
export const SEARCH_HIDE_TRANSLATE_X = -24;

/** Yüzen barın kapladığı yükseklik: diğer üst barlarla TEK formül (güvenli alan + satır + alt pay). */
export function useFloatingBarInset(): number {
  return useHeaderBarInset();
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
 * Arama alanının daralma stili (`progress`: 0 görünür, 1 gizli) — SAF worklet. Arama alanı cam
 * yüzey (`GlassSurface`) olduğundan iki yol (alt menü hapıyla aynı kural, bkz. `pillHideStyle`):
 * - Fallback (cam yok): yukarı + sola kayarak solar.
 * - Cam: native cam, ata `opacity < 1` iken efektini kaybeder — opacity YOK; yüzey yukarı + sola
 *   kayıp ekranın üstünden çıkar (`glassHideY`, negatif), içerik `searchContentOpacity` ile solar.
 */
export function searchHideStyle(glass: boolean, progress: number, glassHideY: number) {
  'worklet';
  if (glass) {
    return {
      transform: [{ translateY: progress * glassHideY }, { translateX: progress * SEARCH_HIDE_TRANSLATE_X }],
    };
  }
  return {
    opacity: 1 - progress,
    transform: [
      { translateY: progress * SEARCH_HIDE_TRANSLATE_Y },
      { translateX: progress * SEARCH_HIDE_TRANSLATE_X },
    ],
  };
}

/** Camda arama içeriğinin (ikon + metin) opaklığı; fallback'te sarmalayıcı solduğu için 1 — SAF worklet. */
export function searchContentOpacity(glass: boolean, progress: number): number {
  'worklet';
  return glass ? 1 - progress : 1;
}
