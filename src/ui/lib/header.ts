import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
