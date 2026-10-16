import type { IconName } from '@/ui';
import type { TFunction } from 'i18next';

export interface MenuPage {
  /** `app/` altındaki rota (ör. `following` → `/following`). */
  route: string;
  label: string;
  icon: IconName;
}

/**
 * Bilgi metni değil, kullanıcının kendi hesabına ait ekranlar — hesap/koleksiyon
 * bölümlerinde gösterilirler (testID `profile-account-<route>-link`).
 *
 * Etiketler çeviriden geldiği için liste bir FABRİKA: modül seviyesinde kurulsaydı
 * `t` daha hazır olmadan çalışır ve etiketler ilk dilde donardı.
 */
export const buildAccountPages = (t: TFunction): ReadonlyArray<MenuPage> => [
  { route: 'following', label: t('mobile.settingsFollowing'), icon: 'user-group' },
  { route: 'newsletter', label: t('mobile.settingsNewsletter'), icon: 'envelope' },
];
