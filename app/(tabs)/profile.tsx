import { RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { pageListContentStyle, theme, usePageScrollValue, usePageContentStyle } from '@/ui';

import { useProfile } from './_hooks/useProfile';
import { ProfileGuestView } from './_components/ProfileGuestView';
import { ProfileCard, ProfileMenuSections } from './_components/ProfileSections';

const { colors } = theme;

/**
 * Profil sekmesi — sekme kökü (AppShell, başlıklı bar: solu BOŞ, sağda tek ⚙️ Ayarlar düğmesi;
 * "Profili düzenle" kalemi kimlik satırında). Düz (kartsız) düzen: yatay kompakt kimlik başlığı +
 * kullanıcının işlemleri (Alışveriş · Finans · Koleksiyon · Analiz, gruplu satırlar). Hesap / ödeme
 * ayarları / üyelik / tercihler / destek / yasal ve çıkış Ayarlar ekranında (`/settings`).
 * `useProfile` tüm sorgu ve eylemlerin sahibi; ekran yalnız misafir/üye dallanması ve kompozisyon.
 */
function ProfileScreen() {
  const f = useProfile();
  const { t } = useTranslation();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE çağrılır (app/CLAUDE.md › Thin screens).
  const tabInset = useTabBarInset();
  const page = usePageScrollValue();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle([pageListContentStyle, { paddingBottom: tabInset }]);
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);

  if (!f.isAuthenticated) return <ProfileGuestView f={f} />;

  return (
    <AppShell variant="title" title={t('profile.profile')} scroll={page} leading="none" actions="settings">
      <Animated.ScrollView
        {...tabScroll}
        {...page.scrollProps}
        scrollEventThrottle={16}
        // Sayfa kenarı + kartlar arası boşluk (kimlik kartı + grup kartları).
        contentContainerStyle={page.contentStyle(listContentStyle)}
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
        <ProfileMenuSections />
      </Animated.ScrollView>
    </AppShell>
  );
}

export default tabDiag('profile', ProfileScreen);
