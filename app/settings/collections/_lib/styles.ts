import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
  // Cells are sized by `gridCellStyle` (columns from the window width; 48% / 4% on phones).
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing[3],
  },
  collectionCard: {
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
});
