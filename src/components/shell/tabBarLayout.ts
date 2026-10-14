import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingBottomOffset, theme } from '@/ui';

const { spacing, headerHeight } = theme;

/**
 * Bar içerik satırı yüksekliği (güvenli alan hariç) = `theme.headerHeight`, yığın ekranlarının
 * ScreenHeader satırıyla AYNI: tab kökü <-> yığın ekranı geçişinde barın alt kenarı aynı y'de
 * kalır. Arama alanı (40) ve 44pt ikon kutuları bu satırda dikey ortalanır.
 */
export const APP_SHELL_BAR_HEIGHT = headerHeight;


/** Yüzen alt menü (hap) yüksekliği. */
export const TAB_PILL_HEIGHT = 64;
/** Ayrı yuvarlak "+" (İlan Ver) düğmesi: hapla aynı yükseklikte (daire). */
export const TAB_SELL_SIZE = TAB_PILL_HEIGHT;
/** Hap ile "+" düğmesi arasındaki boşluk. */
export const TAB_SELL_GAP = spacing[3];
/** Hap ile ekranın yan kenarları arasındaki boşluk. */
export const TAB_PILL_SIDE_GAP = spacing[4];
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
