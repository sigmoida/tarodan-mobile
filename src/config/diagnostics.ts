/**
 * Ham hata teşhisi (stack trace, console dökümü, son route) ekranda gösterilsin mi?
 *
 * Yalnız geliştirmede ve staging/preview build'lerinde. Production'da kullanıcı —
 * ve App Review — geliştirici çıktısı değil, çevrilmiş "tekrar dene" ekranı görür;
 * hata yine Sentry'ye gider. (Eskiden bu teşhis "geçici" diye her ortamda açıktı
 * ve production build "### TAB CRASHED ###" gösterebiliyordu.)
 */
export function shouldShowDiagnostics(
  env: string | undefined = process.env.EXPO_PUBLIC_ENVIRONMENT,
  isDev: boolean = __DEV__,
): boolean {
  return isDev || env !== 'production';
}

export const SHOW_DIAGNOSTICS = shouldShowDiagnostics();
