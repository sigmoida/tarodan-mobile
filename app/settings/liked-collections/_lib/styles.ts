import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
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
  /** Kapak üstünde sağ üst: beğeniyi kaldır (cam daire, dolu kırmızı kalp). */
  unlikeButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
  },
  collectionInfo: {
    padding: spacing[3],
    gap: spacing[1],
  },
  collectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  likeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
});
