import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Badge, Button, Divider, Text, theme, Icon } from '@/ui';

import { buildAvatarUrl } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { buildProfileMenuGroups, type ProfileBadgeKey, type ProfileMenuItem } from '../_lib/profileMenu';
import type { ProfileController } from '../_hooks/useProfile';

const { colors, spacing, radiusRole, typography, minTouchTarget } = theme;

type SectionProps = { f: ProfileController };

// ---------------------------------------------------------------------------
// Kimlik başlığı: avatar, ad, e-posta, üyelik rozeti, güven skoru, düzenle
// (web ProfileSidebar "Identity header")
// ---------------------------------------------------------------------------
export function ProfileCard({ f }: SectionProps) {
  const { t } = useTranslation();
  const { user } = f;
  return (
    <View style={styles.identity}>
      <View style={styles.identityRow}>
        <Avatar
          size="lg"
          name={user?.displayName || 'U'}
          source={user?.avatar && user?.id ? buildAvatarUrl(String(user.id), user.avatar) : undefined}
        />
        <View style={styles.identityText}>
          <Text variant="label" numberOfLines={1}>
            {user?.displayName || t('nav.account')}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {user?.email}
          </Text>
          {f.isPaidTier ? (
            <View style={styles.tierBadge}>
              <Badge variant="default" size="sm">
                {t('profile.tierMemberBadge', { tier: f.tierLabel })}
              </Badge>
            </View>
          ) : null}
        </View>
        <Button
          variant="outline"
          size="sm"
          title={t('common.edit')}
          onPress={() => router.push('/settings/edit-profile')}
        />
      </View>
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Menü satırı (ikonsuz) — web ProfileSidebar bağlantısı: etiket + sayaç rozeti
// ---------------------------------------------------------------------------
interface MenuRowProps {
  item: ProfileMenuItem;
  count?: number;
}

function MenuRow({ item, count = 0 }: MenuRowProps) {
  const primary = item.tone === 'primary';
  return (
    <Pressable
      testID={item.testID}
      accessibilityRole="link"
      onPress={() => router.push(item.to as never)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text variant="bodySm" tone={primary ? 'primary' : 'body'} weight={primary ? 'medium' : 'regular'} style={styles.rowLabel} numberOfLines={1}>
        {item.label}
      </Text>
      {item.rightBadge ? (
        <Badge variant="default" size="sm">
          {item.rightBadge}
        </Badge>
      ) : null}
      {count > 0 ? (
        <Badge variant="danger" appearance="solid" size="sm" testID={item.testID ? `${item.testID}-badge` : undefined}>
          {count > 99 ? '99+' : String(count)}
        </Badge>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Gruplu menü + çıkış + hesabı sil
// ---------------------------------------------------------------------------
export function ProfileMenuSections({
  f,
  badges,
  isBusiness,
}: SectionProps & {
  /** Bekleyen iş sayaçları (`useHomeBadges`). Verilmezse rozet çizilmez. */
  badges?: Partial<Record<ProfileBadgeKey, number>>;
  /** Kurumsal hesap mı (companyName + taxId var) — "Kurumsal Başvuru" satırını gösterir. */
  isBusiness?: boolean;
}) {
  const { t } = useTranslation();
  // Dil değişince etiketler de değişsin diye liste `t`'ye bağlı kuruluyor.
  const groups = React.useMemo(
    () =>
      buildProfileMenuGroups(t, {
        isBusiness: !!isBusiness,
        // iOS'ta abonelik satılmıyor (Apple 2.1(b)): ücretsiz kullanıcı "Üyelik Planı" ve
        // "Aboneliğim" girişlerini görmez. Ücretli üye görür — iOS'ta aboneliğini iptal
        // edebileceği tek yer.
        showMembership: CAN_BUY_DIGITAL || f.isPaidTier,
        isPaidTier: f.isPaidTier,
        tierLabel: f.tierLabel,
        isBusinessTier: f.effectiveTier.toLowerCase() === 'business',
      }),
    [t, isBusiness, f.isPaidTier, f.tierLabel, f.effectiveTier],
  );
  return (
    <>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text variant="overline" tone="subtle" style={styles.groupTitle}>
            {group.title}
          </Text>
          {group.items.map((item) => (
            <MenuRow
              key={item.key}
              item={item}
              count={item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0}
            />
          ))}
        </View>
      ))}

      <Divider />
      <Pressable
        testID="profile-logout-button"
        accessibilityRole="button"
        style={({ pressed }) => [styles.logout, pressed && styles.rowPressed]}
        onPress={f.handleLogout}
      >
        <Icon name="arrow-left-on-rectangle" size={theme.iconSize.md} color={colors.danger[600]!} />
        <Text variant="bodySm" tone="danger">
          {t('common.logout')}
        </Text>
      </Pressable>
    </>
  );
}

/** Hesabı sil — kartın dışında, küçük danger metin bağlantısı. */
export function ProfileDeleteAccount({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      testID="profile-delete-account-button"
      accessibilityRole="button"
      style={styles.deleteAccount}
      onPress={f.handleDeleteAccount}
      hitSlop={spacing[2]}
    >
      <Text variant="caption" tone="danger">
        {t('settings.deleteAccount')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: {
    padding: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  identityText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  tierBadge: { flexDirection: 'row', marginTop: spacing[1] },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  group: { paddingBottom: spacing[1] },
  groupTitle: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
    fontSize: typography.fontSize['2xs'],
    letterSpacing: typography.fontSize['2xs'] * 0.1,
  },
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  rowPressed: { backgroundColor: colors.surface.alt },
  rowLabel: { flex: 1 },
  logout: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomLeftRadius: radiusRole.section,
    borderBottomRightRadius: radiusRole.section,
  },
  deleteAccount: { alignSelf: 'center', paddingVertical: spacing[4] },
});
