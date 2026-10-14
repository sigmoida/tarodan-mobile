import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from './theme';

const { spacing } = theme;

/**
 * Ekranın altında YÜZEN öğelerin (alt menü hapı, "+" düğmesi, FAB) ekran altından uzaklığı — TEK formül.
 * - iOS ve Android hareket gezinmesi (ince, saydam tutamaç, güvenli alan < 40): öğe tutamaç şeridine
 *   hafifçe biner (`insetBottom - 8`, en az 12).
 * - Android 3 düğmeli gezinme (opak, dokunulabilir çubuk, güvenli alan ≥ 40): öğe çubuğun ÜSTÜNDE durur
 *   (`insetBottom + 8`); üstüne binerse kesilir.
 */
export const ANDROID_BUTTON_NAV_MIN_INSET = 40;

export function floatingBottomOffset(insetBottom: number, os: typeof Platform.OS = Platform.OS): number {
  if (os === 'android' && insetBottom >= ANDROID_BUTTON_NAV_MIN_INSET) return insetBottom + spacing[2];
  return Math.max(insetBottom - spacing[2], spacing[3]);
}

/** Yüzen öğenin alt uzaklığı (güncel güvenli alana göre). */
export function useFloatingBottomOffset(): number {
  return floatingBottomOffset(useSafeAreaInsets().bottom);
}

/** FAB (md, 56) olan bir ekranın kaydırma içeriğine eklenecek alt boşluk: son öğe FAB'ın altında kalmasın. */
export const FAB_SIZE_MD = 56;
export function useFabContentInset(fabSize: number = FAB_SIZE_MD): number {
  return useFloatingBottomOffset() + fabSize + spacing[2];
}
