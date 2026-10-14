import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from './theme';

/**
 * Üst barların (ScreenHeader, PageShell, AppShell, AuthShell, sohbet, tam ekran sheet, görsel
 * görüntüleyici…) güvenli alan üst boşluğu — TEK formül: `useSafeAreaInsets().top`.
 *
 * Eskiden her kabuk kendi formülünü yazıyordu (`max(top, iOS ? 44 : StatusBar.currentHeight)`,
 * `top + 8`, `max(top, 12)`, `top + 24`…); iPhone SE / iPad'de ve Android'de üst bar farklı
 * yükseklikte çıkıyordu. Dynamic Island ve çentik `insets.top`'a zaten yansır; 44pt minimumu ve
 * `StatusBar.currentHeight` yedeği gerekmez. Ekranlar doğrudan `insets.top` okumaz
 * (lint: `tarodan/no-custom-screen-header`).
 */
export function useHeaderTopInset(): number {
  return useSafeAreaInsets().top;
}

/**
 * Yüzen üst barın kapladığı toplam yükseklik: güvenli alan üstü + `theme.headerHeight` + `theme.headerBottomPad`. İçerik bar
 * ALTINDAN kaydığı için kaydırılabilir listeler bu kadar üst boşlukla başlar (`PageShell` kendi
 * gövdesi için otomatik ekler; ekranın kendi listesi için `usePageScrollHandler().topInset`).
 */
export function useHeaderBarInset(): number {
  return useHeaderTopInset() + theme.headerHeight + theme.headerBottomPad;
}
