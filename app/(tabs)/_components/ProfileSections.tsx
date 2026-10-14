import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Chip, Divider, IconButton, Text, theme } from '@/ui';

import { buildAvatarUrl } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { buildProfileMenuGroups, selectProfileSections } from '../_lib/profileMenu';
import type { ProfileController } from '../_hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileRow } from './ProfileRow';

const { spacing } = theme;

type SectionProps = { f: ProfileController };

// ---------------------------------------------------------------------------
// Kimlik başlığı (yatay kompakt): solda avatar, sağında ad + e-posta; altında tek satırda
// üyelik rozeti + güven skoru + görünürlük çipi (dar ekranda alt satıra sarar). "Profili
// düzenle" girişi kimlik satırının sağındaki kalem (üst barın sağı sekme köklerinde sabit:
// Mesajlar + Bildirimler).
// ---------------------------------------------------------------------------
export function ProfileCard({ f }: SectionProps) {
  const { t } = useTranslation();
  const { user } = f;
  const showTrust = f.isPremiumProfile && f.trustScore != null;
  const badges =
    f.isPaidTier || showTrust ? (
      <View style={styles.badgeRow} testID="profile-badges">
        {f.isPaidTier ? (
          <Badge variant="default" size="sm">
            {t('profile.tierMemberBadge', { tier: f.tierLabel })}
          </Badge>
        ) : null}
        {showTrust ? (
          <>
            <Badge variant="warning" size="sm">
              {t('seller.trustScoreLabel', { score: f.trustScore })}
              {f.trustLevel ? t('seller.trustScoreLevelSuffix', { level: f.trustLevel }) : ''}
            </Badge>
            <Chip
              testID="profile-trust-visibility"
              size="sm"
              selected={f.showTrustScore}
              label={f.showTrustScore ? t('mobile.profileTrustPublic') : t('mobile.profileTrustHidden')}
              onPress={() => f.trustVisibilityMutation.mutate(!f.showTrustScore)}
              disabled={f.trustVisibilityMutation.isPending}
            />
          </>
        ) : null}
      </View>
    ) : null;

  return (
    <ProfileHeader
      layout="row"
      name={user?.displayName || 'U'}
      source={user?.avatar && user?.id ? buildAvatarUrl(String(user.id), user.avatar) : undefined}
      footer={badges}
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
        // iOS'ta abonelik satılmıyor (Apple 2.1(b)): ücretsiz kullanıcı "Üyelik Planı" ve
        // "Aboneliğim" girişlerini görmez. Ücretli üye görür — iOS'ta aboneliğini iptal
        // edebileceği tek yer.
        showMembership: CAN_BUY_DIGITAL || f.isPaidTier,
        isPaidTier: f.isPaidTier,
        tierLabel: f.tierLabel,
        isBusinessTier: f.effectiveTier.toLowerCase() === 'business',
      })),
    [t, isBusiness, f.isPaidTier, f.tierLabel, f.effectiveTier],
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
              rightBadge={item.rightBadge}
              onPress={() => router.push(item.to as never)}
            />
          ))}
        </View>
      ))}

      <Divider style={styles.divider} />
      <ProfileRow
        testID="profile-logout-button"
        role="button"
        icon="arrow-left-on-rectangle"
        label={t('common.logout')}
        chevron={false}
        onPress={f.handleLogout}
      />
    </>
  );
}

/** Hesabı sil — listenin en altında, danger metin satırı (ikon/chevron yok). */
export function ProfileDeleteAccount({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <ProfileRow
      testID="profile-delete-account-button"
      role="button"
      tone="danger"
      label={t('settings.deleteAccount')}
      chevron={false}
      onPress={f.handleDeleteAccount}
    />
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  group: { paddingTop: spacing[2], paddingBottom: spacing[1] },
  divider: { marginVertical: spacing[1] },
});
