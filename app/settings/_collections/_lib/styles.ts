import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.warning[50]!,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.warning[200]!,
    padding: spacing[4],
  },
  premiumNoticeText: {
    flex: 1,
    gap: spacing[0.5],
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing[3],
  },
  collectionCard: {
    width: '48%',
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  collectionImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface.alt,
  },
  collectionInfo: {
    padding: spacing[3],
    gap: spacing[1],
  },
  collectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[1],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
  },
});
