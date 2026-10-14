import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Divider, Text, theme } from '@/ui';

import { buildAvatarUrl } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { buildProfileMenuGroups, selectProfileSections } from '../_lib/profileMenu';
import type { ProfileController } from '../_hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileRow } from './ProfileRow';

const { spacing, radius } = theme;

type SectionProps = { f: ProfileController };

// ---------------------------------------------------------------------------
// Kimlik başlığı (Storytel "Profilim"): ortalı büyük avatar, ad, e-posta, üyelik rozeti,
// ortalı çerçeveli "Profili düzenle" düğmesi, güven skoru.
// ---------------------------------------------------------------------------
export function ProfileCard({ f }: SectionProps) {
  const { t } = useTranslation();
  const { user } = f;
  return (
    <ProfileHeader
      name={user?.displayName || 'U'}
      source={user?.avatar && user?.id ? buildAvatarUrl(String(user.id), user.avatar) : undefined}
    >
      <View style={styles.identityText}>
        <Text variant="h2" align="center" numberOfLines={1} testID="profile-name">
          {user?.displayName || t('nav.account')}
        </Text>
        {user?.email ? (
          <Text variant="bodySm" tone="muted" align="center" numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
        {f.isPaidTier ? (
          <View style={styles.tierBadge}>
            <Badge variant="default" size="sm">
              {t('profile.tierMemberBadge', { tier: f.tierLabel })}
            </Badge>
          </View>
        ) : null}
      </View>
      <Button
        testID="profile-edit-button"
        variant="outline"
        size="md"
        title={t('profile.editProfile')}
        style={styles.editButton}
        onPress={() => router.push('/settings/edit-profile')}
      />
      {f.isPremiumProfile && f.trustScore != null ? (
        <View style={styles.trustRow}>
          <Badge variant="warning" size="sm">
            {t('seller.trustScoreLabel', { score: f.trustScore })}
            {f.trustLevel ? t('seller.trustScoreLevelSuffix', { level: f.trustLevel }) : ''}
          </Badge>
          <Pressable
            onPress={() => f.trustVisibilityMutation.mutate(!f.showTrustScore)}
            disabled={f.trustVisibilityMutation.isPending}
            hitSlop={spacing[3]}
            accessibilityRole="button"
          >
            <Text variant="caption">
              {f.showTrustScore ? t('mobile.profileTrustPublic') : t('mobile.profileTrustHidden')}
            </Text>
          </Pressable>
        </View>
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
  identityText: { alignItems: 'center', gap: spacing[0.5], maxWidth: '100%' },
  tierBadge: { flexDirection: 'row', marginTop: spacing[1] },
  editButton: { alignSelf: 'center', borderRadius: radius.full, paddingHorizontal: spacing[6] },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  group: { paddingTop: spacing[2], paddingBottom: spacing[1] },
  divider: { marginVertical: spacing[1] },
});
