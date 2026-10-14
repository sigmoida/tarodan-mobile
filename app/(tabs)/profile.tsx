import { RefreshControl } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { TopBarAction, theme, usePageScrollValue } from '@/ui';

import { useProfile } from './_hooks/useProfile';
import { ProfileGuestView } from './_components/ProfileGuestView';
import {
  ProfileCard,
  ProfileDeleteAccount,
  ProfileMenuSections,
} from './_components/ProfileSections';

const { colors } = theme;

/**
 * Profil sekmesi — sekme kökü (AppShell, başlıklı bar; sağ üstte "Profili düzenle" kalemi). Düz
 * (kartsız) düzen: yatay kompakt kimlik başlığı + Hesap satırları (ikon + chevron) + çıkış + hesabı sil. Alışveriş / Finans / Koleksiyon / Analiz /
 * Destek / Bilgi Ana Sayfa yan menüsündedir (`DrawerMenu`).
 * `useProfile` tüm sorgu ve eylemlerin sahibi; ekran yalnız misafir/üye dallanması ve kompozisyon.
 */
function ProfileScreen() {
  const f = useProfile();
  const { t } = useTranslation();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE çağrılır (CLAUDE.md §12).
  const tabInset = useTabBarInset();
  const page = usePageScrollValue();
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);

  if (!f.isAuthenticated) return <ProfileGuestView f={f} />;

  return (
    <AppShell
      variant="title"
      title={t('profile.profile')}
      scroll={page}
      right={
        // Maestro akışları `profile-edit-button`'a bağlı (giriş yapılmış mı testi) — misafirde YOK.
        <TopBarAction
          icon="pencil"
          accessibilityLabel={t('profile.editProfile')}
          testID="profile-edit-button"
          onPress={() => router.push('/settings/edit-profile')}
        />
      }
    >
      <Animated.ScrollView
        {...tabScroll}
        {...page.scrollProps}
        scrollEventThrottle={16}
        contentContainerStyle={page.contentStyle({ paddingBottom: tabInset })}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.onRefresh}
            progressViewOffset={page.topInset}
            tintColor={colors.primary[600]}
            colors={[colors.primary[600]!]}
          />
        }
      >
        <ProfileCard f={f} />
        <ProfileMenuSections f={f} isBusiness={!!(f.user?.companyName && f.user?.taxId)} />
        <ProfileDeleteAccount f={f} />
      </Animated.ScrollView>
    </AppShell>
  );
}

export default tabDiag('profile', ProfileScreen);
