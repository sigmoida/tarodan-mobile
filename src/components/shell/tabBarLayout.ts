import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui';

const { spacing, headerHeight } = theme;

/**
 * Bar içerik satırı yüksekliği (güvenli alan hariç) = `theme.headerHeight`, yığın ekranlarının
 * ScreenHeader satırıyla AYNI: tab kökü <-> yığın ekranı geçişinde barın alt kenarı aynı y'de
 * kalır. Arama alanı (40) ve 44pt ikon kutuları bu satırda dikey ortalanır.
 */
export const APP_SHELL_BAR_HEIGHT = headerHeight;


/** Yüzen alt menü (hap) yüksekliği. */
export const TAB_PILL_HEIGHT = 64;
/** Hap ile ekranın yan kenarları arasındaki boşluk. */
export const TAB_PILL_SIDE_GAP = spacing[4];
/** İçeriğin hapın üstünde bırakacağı nefes payı. */
const CONTENT_GAP = spacing[4];

/**
 * Hapın ekran altından uzaklığı: ana ekran çubuğu (güvenli alan altı) bölgesine hafifçe biner;
 * gesture/3-düğme navigasyonu olmayan cihazlarda da asgari boşluk kalır.
 */
export function tabPillBottomOffset(insetBottom: number): number {
  return Math.max(insetBottom - spacing[2], spacing[3]);
}

/**
 * Tab köklerindeki liste / ScrollView'ların ALT DOLGUSU — içerik yüzen hapın altında kalmasın.
 * Tek kaynak: hap yüksekliği + alt boşluk + nefes payı. Her tab kökü bunu `paddingBottom`a ekler.
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom) + CONTENT_GAP;
}
