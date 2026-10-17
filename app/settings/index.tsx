import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { MenuGroupList } from '@/components/menu/MenuGroupList';
import { ProfileRow } from '@/components/menu/ProfileRow';
import { useSettingsScreen } from './_hooks/useSettingsScreen';

/**
 * Ayarlar (`/settings`) — Profil sekmesinin üst barındaki ⚙️'den açılan yığın ekranı. Profil
 * kullanıcının işlemlerini, Ayarlar hesabı ve uygulamayı yönetir: Hesap (profili düzenle, adresler,
 * güvenlik, engellenenler) · Ödeme ve Banka · Üyelik · Tercihler · Yardım & Destek · Bilgi & Yasal;
 * en altta çıkış (yalnız üye). Her grup beyaz `SectionCard` (`MenuGroupList`, Profil ile aynı).
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
    </PageShell>
  );
}
