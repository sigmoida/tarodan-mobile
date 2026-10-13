import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Route-local stylesheet (§12). Monolitten BİREBİR taşındı.
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  body: { gap: theme.spacing[3] },
  card: {
    backgroundColor: colors.surface.DEFAULT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
    backgroundColor: colors.primary[50]!,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radius['3xl'],
  },
  tierText: {
    color: colors.primary[600]!,
    fontWeight: theme.typography.fontWeight.bold,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  activeText: {
    color: colors.success[600]!,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  cancelledNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
    padding: theme.spacing[2.5],
    backgroundColor: colors.warning[50]!,
    borderRadius: theme.radius['2xl'],
  },
  cancelledNoteText: {
    flex: 1,
    color: colors.warning[600]!,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.snug,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[1],
  },
  kvLabel: {
    color: colors.text.muted,
    fontSize: theme.typography.fontSize.sm,
  },
  kvValue: {
    color: colors.text.heading,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  autoTitle: {
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
    marginBottom: theme.spacing[0.5],
  },
  autoSub: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.muted,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.snug,
  },
  helperText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
    marginTop: theme.spacing[3],
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.snug,
  },
  actionBtn: {
    borderRadius: theme.radius['2xl'],
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    backgroundColor: colors.info[50]!,
    borderRadius: theme.radius['2xl'],
    marginTop: theme.spacing[1],
  },
  helpText: {
    flex: 1,
    color: colors.info[600]!,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.snug,
  },
});
