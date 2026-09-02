import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

// Route-local stylesheet (CLAUDE.md §12).
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colors.surface.DEFAULT,
  },
  title: { marginTop: spacing[4], marginBottom: spacing[2] },
  subtitle: { textAlign: 'center', marginBottom: spacing[6], color: colors.text.muted },
  headerCount: { color: colors.white, opacity: 0.8 },
  listContent: { padding: spacing[4], gap: spacing[3] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
  },
  rowInfo: { flex: 1 },
  rowName: { color: colors.text.heading, fontWeight: '600' },
  rowMeta: { color: colors.text.muted, fontSize: 12, marginTop: spacing[1] },
});
