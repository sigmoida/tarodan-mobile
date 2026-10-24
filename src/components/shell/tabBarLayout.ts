import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_ACTION_SIZE, FLOATING_SIDE_GAP, floatingBottomOffset, theme } from '@/ui';

const { spacing, headerHeight } = theme;

/**
 * Bar içerik satırı yüksekliği (güvenli alan hariç) = `theme.headerHeight`, yığın ekranlarının
 * ScreenHeader satırıyla AYNI: tab kökü <-> yığın ekranı geçişinde barın alt kenarı aynı y'de
 * kalır. Arama alanı (40) ve 44pt ikon kutuları bu satırda dikey ortalanır.
 */
export const APP_SHELL_BAR_HEIGHT = headerHeight;


/** Alt menü (hap) yüksekliği: sağ alt FAB'ın çapıyla aynı (tek kaynak `FLOATING_ACTION_SIZE`, @/ui). */
export const TAB_PILL_HEIGHT = FLOATING_ACTION_SIZE;
/** Hap ile ekranın yan kenarları arasındaki boşluk: sağ alt FAB'ın sağ kenar boşluğuyla aynı (@/ui). */
export const TAB_PILL_SIDE_GAP = FLOATING_SIDE_GAP;
/**
 * Widest the pill gets (pt). On tablets and unfolded foldables it is a centred floating pill of this
 * width (the iPadOS floating tab bar look) instead of five items stretched across the window; every
 * phone is narrower (pill = window - 2 x side gap), so phones are unaffected by the cap.
 */
export const TAB_BAR_MAX_WIDTH = 480;

/** Width of the pill in a `windowWidth`-wide window. */
export function tabBarRowWidth(windowWidth: number): number {
  return Math.max(0, Math.min(windowWidth - 2 * TAB_PILL_SIDE_GAP, TAB_BAR_MAX_WIDTH));
}

/** İçeriğin hapın üstünde bırakacağı nefes payı. */
const CONTENT_GAP = spacing[4];

/** Hapın ekran altından uzaklığı — yüzen öğelerin ortak formülü (`floatingBottomOffset`, @/ui). */
export function tabPillBottomOffset(insetBottom: number, os: typeof Platform.OS = Platform.OS): number {
  return floatingBottomOffset(insetBottom, os);
}

/**
 * Hapın ÜST kenarının ekran altından uzaklığı (hap yüksekliği + alt boşluk). Hapın hemen
 * üstünde duran sabit öğeler (sepetin "Ödemeye Geç" çubuğu) `bottom` olarak bunu kullanır.
 */
export function useTabBarTop(): number {
  const insets = useSafeAreaInsets();
  return TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom);
}

/**
 * Tab köklerindeki liste / ScrollView'ların ALT DOLGUSU — içerik sabit hapın altında kalmasın (the bar
 * never collapses, so the padding is the same at every scroll position).
 * Tek kaynak: hap yüksekliği + alt boşluk + nefes payı. Her tab kökü bunu `paddingBottom`a ekler.
 */
export function useTabBarInset(): number {
  return useTabBarTop() + CONTENT_GAP;
}
