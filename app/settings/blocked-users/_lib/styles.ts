import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Route-local stylesheet (CLAUDE.md §12).
export const styles = StyleSheet.create({
  headerCount: { color: colors.text.muted, paddingHorizontal: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  rowInfo: { flex: 1 },
  rowMeta: { marginTop: spacing[1] },
});
