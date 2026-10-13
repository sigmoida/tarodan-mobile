import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Route-local stylesheet (CLAUDE.md §12).
export const styles = StyleSheet.create({
  headerCount: { color: colors.text.muted, paddingHorizontal: spacing[2] },
  row: { marginBottom: spacing[3] },
  rowInfo: { flex: 1 },
  rowMeta: { marginTop: spacing[1] },
});
