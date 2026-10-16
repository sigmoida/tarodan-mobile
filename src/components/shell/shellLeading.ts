/**
 * Sekme köklerinin üst barındaki SOL düğmenin türü — kabuğun KENDİ prop'u (`AppShell`/`TitleShell`
 * `leading`), global rotadan türetilmez (yığında altta kalan Profil barı, üstte başka ekran varken
 * ikon değiştirmesin).
 *
 * - `categories` (varsayılan): `squares-2x2` → `/categories` yığın rotası (Ana Sayfa, Favoriler,
 *   Sepet, İlan Ver).
 * - `menu`: ☰ yan menüyü açar — YALNIZ Profil sekme kökleri (`profile.tsx`, `ProfileGuestView`);
 *   yan menünün soldan kaydırarak açılması da yalnız bu kabuk odaktayken etkin
 *   (`useEdgeSwipeWhenFocused`).
 */
export type ShellLeading = 'menu' | 'categories';

export const DEFAULT_SHELL_LEADING: ShellLeading = 'categories';
