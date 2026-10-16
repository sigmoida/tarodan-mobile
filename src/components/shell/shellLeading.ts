/**
 * Sekme köklerinin üst barındaki SOL düğmenin kararı — saf, test edilebilir.
 *
 * Kural: ☰ (yan menü) YALNIZ Profil sekme kökünde; diğer tüm sekme köklerinde (Ana Sayfa, Favoriler,
 * Sepet, İlan Ver) aynı yerde `squares-2x2` ikonu ve `/categories` yığın rotası. Yan menünün sol
 * kenardan kaydırarak açılması (`SideMenuHost`) da aynı koşula bağlıdır — tek kaynak burası.
 */
export type ShellLeadingAction = 'menu' | 'categories';

/** Profil sekmesinin kök segmentleri: `(tabs)/profile` (`useSegments()` → `['(tabs)', 'profile']`). */
export function isProfileTabRoot(segments: readonly string[] | undefined | null): boolean {
  return !!segments && segments[0] === '(tabs)' && segments[1] === 'profile';
}

/** Sol düğme ne yapar: Profil kökünde yan menüyü açar, diğer sekme köklerinde kategorileri. */
export function shellLeadingAction(segments: readonly string[] | undefined | null): ShellLeadingAction {
  return isProfileTabRoot(segments) ? 'menu' : 'categories';
}
