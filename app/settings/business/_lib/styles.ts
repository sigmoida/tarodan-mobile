import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** Şirket avatarı (pt). */
const AVATAR = 64;
/** Liste satırı görseli ve sıra rozeti (pt). */
const THUMB = 48;
const RANK = 28;

// İşletme paneli ekranının route-local stylesheet'i — web SectionCard/Card dili, token'lı.
export const styles = StyleSheet.create({
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  companyAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radiusRole.avatar,
  },
  companyAvatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radiusRole.avatar,
    backgroundColor: colors.primary[100]!,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyDetails: {
    flex: 1,
    gap: spacing[1],
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  companyName: {
    flexShrink: 1,
  },
  tabsRow: {
    gap: spacing[2],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[1],
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weeklyStat: {
    alignItems: 'center',
    gap: spacing[1],
  },
  rows: {
    gap: spacing[2],
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radiusRole.card,
    padding: spacing[3],
    gap: spacing[3],
  },
  productRank: {
    width: RANK,
    height: RANK,
    borderRadius: radius.full,
    backgroundColor: colors.surface.alt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  productInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  productStats: {
    alignItems: 'flex-end',
    gap: spacing[0.5],
  },
  productStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
});
