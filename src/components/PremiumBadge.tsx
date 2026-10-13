import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, Text, Icon, type IconName } from '@/ui';

const { colors, spacing, iconSize, radiusRole } = theme;

type MembershipTier = 'free' | 'basic' | 'premium' | 'business';

interface MembershipBadgeCardProps {
  membershipTier: MembershipTier;
  isVerified?: boolean;
  /** Verilirse (ücretsiz/temel kademede) "Yükselt" bağlantısı çizilir; verilmezse çizilmez. */
  onUpgrade?: () => void;
}

/**
 * Profil düzenleme üstündeki üyelik kartı: kademe adı + doğrulanmış işareti, ücretsiz/temel kademede
 * "Yükselt" bağlantısı. (Eski `PremiumBadge` / `InlinePremiumBadge` çağıranı olmadığı için kaldırıldı.)
 */
export const MembershipBadgeCard: React.FC<MembershipBadgeCardProps> = ({
  membershipTier,
  isVerified = false,
  onUpgrade,
}) => {
  const { t } = useTranslation();
  const isPremium = membershipTier === 'premium' || membershipTier === 'business';

  const tierInfo: Record<MembershipTier, { name: string; color: string; icon: IconName }> = {
    free: { name: t('membership.memberLabelFree'), color: colors.text.muted, icon: 'user' },
    basic: { name: t('membership.memberLabelBasic'), color: colors.info[600]!, icon: 'user-circle' },
    premium: { name: t('membership.memberLabelPremium'), color: colors.primary[600]!, icon: 'sparkles' },
    business: { name: t('footer.corporate'), color: colors.primary[700]!, icon: 'building-office-2' },
  };
  const info = tierInfo[membershipTier];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name={info.icon} variant="solid" size={iconSize.lg} color={info.color} />
        <Text variant="label" weight="semibold" color={info.color} style={styles.title}>
          {info.name}
        </Text>
        {isVerified ? (
          <Icon name="check-circle" variant="solid" size={iconSize.md} color={colors.success[600]!} />
        ) : null}
      </View>

      {!isPremium && onUpgrade ? (
        <Pressable
          style={styles.upgradeLink}
          onPress={onUpgrade}
          accessibilityRole="button"
          hitSlop={{ top: spacing[3], bottom: spacing[3], left: spacing[3], right: spacing[3] }}
        >
          <Text variant="caption" weight="medium" tone="primary">
            {t('membership.upgrade')}
          </Text>
          <Icon name="chevron-right" size={iconSize.sm} color={colors.primary[600]!} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusRole.card,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { flexShrink: 1 },
  upgradeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing[2],
  },
});

export default MembershipBadgeCard;
