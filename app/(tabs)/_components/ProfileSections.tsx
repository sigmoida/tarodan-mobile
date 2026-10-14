import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, Text, theme } from '@/ui';

import { buildAvatarUrl } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { buildProfileMenuGroups, selectProfileSections } from '../_lib/profileMenu';
import type { ProfileController } from '../_hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileRow } from './ProfileRow';

const { spacing } = theme;

type SectionProps = { f: ProfileController };

// ---------------------------------------------------------------------------
// Kimlik başlığı (yatay kompakt): solda avatar, sağında ad + e-posta. Rozet YOK (üyelik / güven
// skoru / görünürlük çipi kaldırıldı; güven skoru görünürlüğü Profili Düzenle'de). "Profili
// düzenle" girişi kimlik satırının sağındaki kalem (üst barın sağı sekme köklerinde sabit:
// Mesajlar + Bildirimler).
// ---------------------------------------------------------------------------
export function ProfileCard({ f }: SectionProps) {
  const { t } = useTranslation();
  const { user } = f;
  return (
    <ProfileHeader
      layout="row"
      name={user?.displayName || 'U'}
      source={user?.avatar && user?.id ? buildAvatarUrl(String(user.id), user.avatar) : undefined}
      trailing={
        // Maestro akışları `profile-edit-button`'a bağlı (giriş yapılmış mı testi) — misafirde YOK.
        <IconButton
          icon="pencil"
          variant="ghost"
          accessibilityLabel={t('profile.editProfile')}
          testID="profile-edit-button"
          onPress={() => router.push('/settings/edit-profile')}
        />
      }
    >
      <Text variant="h3" weight="bold" numberOfLines={1} testID="profile-name">
        {user?.displayName || t('nav.account')}
      </Text>
      {user?.email ? (
        <Text variant="bodySm" tone="muted" numberOfLines={1}>
          {user.email}
        </Text>
      ) : null}
    </ProfileHeader>
  );
}

// ---------------------------------------------------------------------------
// Profille ilgili menü (yalnız Hesap grubu, başlıksız) + çıkış. Diğer gruplar Ana Sayfa yan menüsünde.
// ---------------------------------------------------------------------------
export function ProfileMenuSections({
  f,
  isBusiness,
}: SectionProps & {
  /** Kurumsal hesap mı (companyName + taxId var) — "Kurumsal Başvuru" satırını gösterir. */
  isBusiness?: boolean;
}) {
  const { t } = useTranslation();
  // Dil değişince etiketler de değişsin diye liste `t`'ye bağlı kuruluyor.
  const groups = React.useMemo(
    () =>
      selectProfileSections(buildProfileMenuGroups(t, {
        isBusiness: !!isBusiness,
        // iOS'ta abonelik satılmıyor (Apple 2.1(b)): ücretsiz kullanıcı "Üyelik Planı"
        // girişini görmez. Ücretli üye planını ve abonelik durumunu (salt görüntüleme) görür.
        showMembership: CAN_BUY_DIGITAL || f.isPaidTier,
        isBusinessTier: f.effectiveTier.toLowerCase() === 'business',
      })),
    [t, isBusiness, f.isPaidTier, f.effectiveTier],
  );
  return (
    <>
      {groups.map((group) => (
        // Grup başlığı ("Hesap") yok: profilde tek grup var, satırlar kimlik başlığının hemen altında.
        <View key={group.key} style={styles.group}>
          {group.items.map((item) => (
            <ProfileRow
              key={item.key}
              testID={item.testID}
              icon={item.icon}
              label={item.label}
              tone={item.tone}
              onPress={() => router.push(item.to as never)}
            />
          ))}
        </View>
      ))}

      {/* Çıkış diğer satırlarla aynı satır (yükseklik, ikon, chevron); yalnız metin + ikon danger. */}
      <ProfileRow
        testID="profile-logout-button"
        role="button"
        tone="danger"
        icon="arrow-left-on-rectangle"
        label={t('common.logout')}
        onPress={f.handleLogout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  group: { paddingTop: spacing[2], paddingBottom: spacing[1] },
});
