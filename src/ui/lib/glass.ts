/**
 * iOS 26 Liquid Glass erişimi — `expo-glass-effect` YEREL modül olduğundan eski binary'de / Expo Go'da
 * yoktur; modülün import'u bile (requireNativeViewManager) atabilir. Bu yüzden `require` try/catch
 * içinde ve iki kontrolle korunur (`isLiquidGlassAvailable`: iOS 26+ + Xcode 26 derlemesi,
 * `isGlassEffectAPIAvailable`: bazı iOS 26 beta'larında API eksik/çökebilir). Biri tutmazsa `null`
 * döner ve çağıran düz (fallback) görünüme düşer; ekran asla çökmez.
 */
import { Platform } from 'react-native';
import type { ComponentType } from 'react';
import type { GlassViewProps } from 'expo-glass-effect';

export type GlassViewComponent = ComponentType<GlassViewProps>;

let cached: GlassViewComponent | null | undefined;

/** Cam bileşeni; kullanılamıyorsa (Android, iOS < 26, modül yok) `null`. Sonuç bellekte tutulur. */
export function getGlassView(): GlassViewComponent | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'ios') return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('expo-glass-effect') as typeof import('expo-glass-effect');
    if (mod.isLiquidGlassAvailable() && mod.isGlassEffectAPIAvailable()) cached = mod.GlassView;
  } catch {
    cached = null;
  }
  return cached;
}

/** Yalnız testler için: bellekteki karar sıfırlanır. */
export function resetGlassCache(): void {
  cached = undefined;
}
