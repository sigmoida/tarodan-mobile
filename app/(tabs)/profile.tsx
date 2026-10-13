import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { Card, PageHeader, theme } from '@/ui';

import { useProfile } from './_hooks/useProfile';
import { useHomeBadges } from './_hooks/useHomeBadges';
import { ProfileGuestView } from './_components/ProfileGuestView';
import {
  ProfileCard,
  ProfileDeleteAccount,
  ProfileMenuSections,
} from './_components/ProfileSections';

const { colors, spacing } = theme;

/**
 * Profil sekmesi — sekme kökü (AppShell). Web `ProfileSidebar`'ın gruplu, ikonsuz listesi:
 * kimlik başlığı + Alışveriş / Finans / Koleksiyon / Analiz / İletişim / Hesap / Bilgi.
 * `useProfile` tüm sorgu ve eylemlerin sahibi; ekran yalnız misafir/üye dallanması ve kompozisyon.
 */
function ProfileScreen() {
  const f = useProfile();
  const { t } = useTranslation();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE çağrılır (CLAUDE.md §12).
  const badges = useHomeBadges(f.isAuthenticated);

  if (!f.isAuthenticated) return <ProfileGuestView f={f} />;

  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.onRefresh}
            tintColor={colors.primary[600]}
            colors={[colors.primary[600]!]}
          />
        }
      >
        <PageHeader title={t('profile.profile')} />
        <Card variant="bordered" padding={0} style={styles.card}>
          <ProfileCard f={f} />
          <ProfileMenuSections
            f={f}
            badges={{ pendingOffers: badges.pendingOffers, pendingTrades: badges.pendingTrades }}
            isBusiness={!!(f.user?.companyName && f.user?.taxId)}
          />
        </Card>
        <ProfileDeleteAccount f={f} />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[2], paddingBottom: spacing[8] },
  card: { overflow: 'hidden' },
});

export default tabDiag('profile', ProfileScreen);
