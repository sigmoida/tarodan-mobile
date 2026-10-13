import { RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { Card, theme } from '@/ui';

import { useProfile } from './_hooks/useProfile';
import { ProfileGuestView } from './_components/ProfileGuestView';
import {
  ProfileCard,
  ProfileDeleteAccount,
  ProfileMenuSections,
} from './_components/ProfileSections';

const { colors, spacing } = theme;

/**
 * Profil sekmesi — sekme kökü (AppShell, başlıklı bar). Yalnız profille ilgili alanlar: kimlik
 * başlığı + Hesap grubu (ayarlar) + çıkış + hesabı sil. Alışveriş / Finans / Koleksiyon / Analiz /
 * Destek / Bilgi Ana Sayfa yan menüsündedir (`DrawerMenu`).
 * `useProfile` tüm sorgu ve eylemlerin sahibi; ekran yalnız misafir/üye dallanması ve kompozisyon.
 */
function ProfileScreen() {
  const f = useProfile();
  const { t } = useTranslation();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE çağrılır (CLAUDE.md §12).
  const tabInset = useTabBarInset();
  const tabScroll = useTabBarScrollHandler();

  if (!f.isAuthenticated) return <ProfileGuestView f={f} />;

  return (
    <AppShell variant="title" title={t('profile.profile')}>
      <Animated.ScrollView
        {...tabScroll}
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
          <ProfileMenuSections f={f} isBusiness={!!(f.user?.companyName && f.user?.taxId)} />
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
