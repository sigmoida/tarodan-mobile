import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
  list: { gap: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  thumb: {
    width: spacing[16],
    height: spacing[16],
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  rowInfo: { flex: 1, gap: spacing[0.5] },
});
