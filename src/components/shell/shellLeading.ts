/**
 * Sekme köklerinin üst barındaki SOL düğmenin türü — kabuğun KENDİ prop'u (`AppShell`/`TitleShell`
 * `leading`), global rotadan türetilmez.
 *
 * - `categories` (varsayılan): `squares-2x2` → `/categories` yığın rotası (Ana Sayfa, Favoriler,
 *   Sepet, İlan Ver).
 * - `none`: sol slot BOŞ — yalnız Profil sekme kökleri (`profile.tsx`, `ProfileGuestView`).
 */
export type ShellLeading = 'categories' | 'none';

export const DEFAULT_SHELL_LEADING: ShellLeading = 'categories';

/**
 * Sekme köklerinin üst barındaki SAĞ grup:
 * - `inbox` (varsayılan): Mesajlar + Bildirimler (sayaçlı) — tüm sekme kökleri.
 * - `settings`: tek ⚙️ Ayarlar düğmesi (`/settings`) — yalnız Profil sekme kökleri.
 */
export type ShellActions = 'inbox' | 'settings';

export const DEFAULT_SHELL_ACTIONS: ShellActions = 'inbox';
