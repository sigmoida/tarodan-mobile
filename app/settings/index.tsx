import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { MenuGroupList } from '@/components/menu/MenuGroupList';
import { ProfileRow } from '@/components/menu/ProfileRow';
import { AppBuildLabel } from './_components/AppBuildLabel';
import { useSettingsScreen } from './_hooks/useSettingsScreen';

/**
 * Settings (`/settings`), the stack screen opened from the gear in the Profile tab's top bar.
 * Profile holds the user's activity; Settings manages the account and the app: Account (edit
 * profile, addresses, security, blocked users) · Payments and Bank · Membership · Preferences ·
 * Help & Support · Info & Legal; then logout (members only) and, last, the build label
 * (`AppBuildLabel`). Each group is a white `SectionCard` (`MenuGroupList`, as on Profile).
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const s = useSettingsScreen();
  return (
    <PageShell title={t('nav.settings')} testID="settings-screen">
      <MenuGroupList groups={s.groups} />
      {s.isAuthenticated ? (
        <SectionCard testID="settings-logout-card">
          {/* Çıkış diğer satırlarla aynı satır (yükseklik, ikon, chevron); yalnız metin + ikon danger. */}
          <ProfileRow
            testID="profile-logout-button"
            variant="card"
            role="button"
            tone="danger"
            icon="arrow-left-on-rectangle"
            label={t('common.logout')}
            onPress={s.handleLogout}
          />
        </SectionCard>
      ) : null}
      <AppBuildLabel />
    </PageShell>
  );
}
