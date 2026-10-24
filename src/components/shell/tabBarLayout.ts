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


/**
 * Ayrı yuvarlak "+" (İlan Ver) düğmesi: yığın ekranlarındaki sağ alt FAB ile aynı çap (tek kaynak
 * `FLOATING_ACTION_SIZE`, @/ui).
 */
export const TAB_SELL_SIZE = FLOATING_ACTION_SIZE;
/** Yüzen alt menü (hap) yüksekliği: "+" ile aynı (yan yana, alt hizalı). */
export const TAB_PILL_HEIGHT = TAB_SELL_SIZE;
/** Hap ile "+" düğmesi arasındaki boşluk. */
export const TAB_SELL_GAP = spacing[3];
/** Hap ile ekranın yan kenarları arasındaki boşluk: sağ alt FAB'ın sağ kenar boşluğuyla aynı (@/ui). */
export const TAB_PILL_SIDE_GAP = FLOATING_SIDE_GAP;
/**
 * Widest the floating row (pill + "+") gets (pt). On tablets and unfolded foldables the row is
 * centred at this width instead of stretching four tabs across the window; every phone is narrower
 * (row = window - 2 x side gap), so phones are unchanged.
 */
export const TAB_BAR_MAX_WIDTH = 480;

/** Width of the floating row (pill + gap + "+") in a `windowWidth`-wide window. */
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
 * Yüzen hapın ÜST kenarının ekran altından uzaklığı (hap yüksekliği + alt boşluk). Hapın hemen
 * üstünde duran sabit öğeler (sepetin "Ödemeye Geç" çubuğu) `bottom` olarak bunu kullanır.
 */
export function useTabBarTop(): number {
  const insets = useSafeAreaInsets();
  return TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom);
}

/**
 * Tab köklerindeki liste / ScrollView'ların ALT DOLGUSU — içerik yüzen hapın / "+" düğmesinin altında kalmasın
 * (ikisi aynı yükseklikte; daralmış halde de aynı dolgu korunur, böylece kaydırma sırasında içerik zıplamaz).
 * Tek kaynak: hap yüksekliği + alt boşluk + nefes payı. Her tab kökü bunu `paddingBottom`a ekler.
 */
export function useTabBarInset(): number {
  return useTabBarTop() + CONTENT_GAP;
}
