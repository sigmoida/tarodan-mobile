import { RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { Card, theme } from '@/ui';

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
 * Profil sekmesi — sekme kökü (AppShell, başlıklı bar). Web `ProfileSidebar`'ın gruplu, ikonsuz listesi:
 * kimlik başlığı + Alışveriş / Finans / Koleksiyon / Analiz / İletişim / Hesap / Bilgi.
 * `useProfile` tüm sorgu ve eylemlerin sahibi; ekran yalnız misafir/üye dallanması ve kompozisyon.
 */
function ProfileScreen() {
  const f = useProfile();
  const { t } = useTranslation();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE çağrılır (CLAUDE.md §12).
  const badges = useHomeBadges(f.isAuthenticated);
  const tabInset = useTabBarInset();
  const onScroll = useTabBarScrollHandler();

  if (!f.isAuthenticated) return <ProfileGuestView f={f} />;

  return (
    <AppShell variant="title" title={t('profile.profile')}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset }]}
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
        <Card variant="bordered" padding={0} style={styles.card}>
          <ProfileCard f={f} />
          <ProfileMenuSections
            f={f}
            badges={{ pendingOffers: badges.pendingOffers, pendingTrades: badges.pendingTrades }}
            isBusiness={!!(f.user?.companyName && f.user?.taxId)}
          />
        </Card>
        <ProfileDeleteAccount f={f} />
      </Animated.ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[2] },
  card: { overflow: 'hidden' },
});

export default tabDiag('profile', ProfileScreen);
