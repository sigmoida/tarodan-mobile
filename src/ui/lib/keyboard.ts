import { useCallback, useState } from 'react';
import { Platform, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { keyboardBottomInset, useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/**
 * Klavyenin üst kenarının, ölçülen tam ekran yüzeyin alt kenarından yüksekliği (kapalıyken 0).
 *
 * Kenardan kenara pencerelerde (kök görünüm, `statusBarTranslucent` + `navigationBarTranslucent`
 * modallar) Android `adjustResize` yüzeyi küçültmez; klavye yüzeyin üstüne biner. Pencere yine de
 * küçüldüyse (`resizedBy` > 0) o kadarı zaten kaçılmıştır: çift kaçış olmasın diye düşülür.
 */
export function keyboardOverlap(keyboardHeight: number, safeBottom: number, resizedBy: number): number {
  if (keyboardHeight <= 0) return 0;
  return Math.max(0, keyboardBottomInset(keyboardHeight, safeBottom) - Math.max(0, resizedBy));
}

/**
 * `keyboardOverlap` + pencere küçülmesi tespiti. Dönen `onLayout`, yüzeyin TAM EKRAN kapsayıcısına
 * (absoluteFill / flex:1) verilir: aynı genişlikte görülen en büyük yükseklikten şimdiki yükseklik
 * farkı = işletim sisteminin klavye için küçülttüğü kısım. Genişlik değişince (döndürme) sıfırlanır.
 */
export function useKeyboardOverlap(): { overlap: number; keyboardHeight: number; onLayout: (e: LayoutChangeEvent) => void } {
  const keyboardHeight = useKeyboardHeight();
  const { bottom } = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0, maxHeight: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => {
      const maxHeight = Math.abs(prev.width - width) < 1 ? Math.max(prev.maxHeight, height) : height;
      if (prev.width === width && prev.height === height && prev.maxHeight === maxHeight) return prev;
      return { width, height, maxHeight };
    });
  }, []);
  const resizedBy = Math.max(0, size.maxHeight - size.height);
  return { overlap: keyboardOverlap(keyboardHeight, bottom, resizedBy), keyboardHeight, onLayout };
}

export interface KeyboardAvoid {
  /** `KeyboardAvoidingView` davranışı: iOS `padding`; Android `undefined` (KAV kaçmaz, dolgu kaçar). */
  behavior: 'padding' | undefined;
  /**
   * Android: kapsayıcıya verilecek alt dolgu = klavyenin yüzeyle örtüşmesi (işletim sistemi pencereyi
   * zaten küçülttüyse o kadarı düşülmüş → çift kaçış yok). iOS'ta 0 (KAV kaçar).
   */
  bottomInset: number;
  /** Klavye açık mı (kaçış kapalıyken hep `false`). Açıkken alt çubuk güvenli alan boşluğunu düşer. */
  keyboardOpen: boolean;
  /** Android'de dolguyu alan TAM EKRAN kapsayıcıya verilir (pencere küçülmesi ölçümü). */
  onLayout: ((e: LayoutChangeEvent) => void) | undefined;
}

/**
 * Tam ekran bir yüzeyin (PageShell gövdesi + sabit alt çubuk) klavyeden kaçışı — TEK kanca.
 *
 * - iOS: `KeyboardAvoidingView behavior="padding"` (kanıtlanmış davranış, değişmedi).
 * - Android (kenardan kenara; `softwareKeyboardLayoutMode` verilmedi → Expo varsayılanı `resize`):
 *   kenardan kenara pencerede `adjustResize` yüzeyi güvenilir biçimde küçültmüyor, KAV `height`
 *   modu da güvenli alanı hesaba katmıyor (`FullScreenGate` notu). Bu yüzden KAV yerine kapsayıcıya
 *   `bottomInset` kadar alt dolgu verilir; pencere yine de küçüldüyse `useKeyboardOverlap` bunu
 *   ölçüp düşer → eksik ya da çift kaçış yok.
 */
export function useKeyboardAvoid(enabled = true): KeyboardAvoid {
  const { overlap, keyboardHeight, onLayout } = useKeyboardOverlap();
  const android = Platform.OS === 'android';
  return {
    behavior: android ? undefined : 'padding',
    bottomInset: enabled && android ? overlap : 0,
    keyboardOpen: enabled && keyboardHeight > 0,
    onLayout: android ? onLayout : undefined,
  };
}
