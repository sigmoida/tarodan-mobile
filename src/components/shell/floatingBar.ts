import { Platform, type ScrollViewProps } from 'react-native';
import { useHeaderBarInset } from '@/ui';

/**
 * Ana sayfa yüzen üst barı — yerleşim yardımcıları (saf; jest'te düz fonksiyon).
 * Bar içeriğin ÜSTÜNDE yüzer (absolute); liste içeriği altından kayar. Bu yüzden liste üstten bar
 * yüksekliği kadar boşlukla başlamalı: `useFloatingBarInset` + `floatingBarScrollProps`.
 */

/** Yüzen barın kapladığı yükseklik: diğer üst barlarla TEK formül (güvenli alan + satır + alt pay). */
export function useFloatingBarInset(): number {
  return useHeaderBarInset();
}

/**
 * Liste üst boşluğu — platforma göre:
 * - iOS: `contentInset.top` (+ başlangıç ofseti -inset). Pull-to-refresh göstergesi barın ALTINDA
 *   açılır, kaydırma çubuğu da bar altından başlar. Dinlenme ofseti -inset olur
 *   (`usePageOffsetHandler` ofseti inset'le normalize eder).
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
