import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Route-local stylesheet (§12). Monolitten kalan kullanılmayan stiller (elle çizilmiş rozet ve
// uyarı kutuları dahil) silindi; uyarılar `Alert`, rozetler `Badge` (@/ui) ile çizilir.
export const styles = StyleSheet.create({
  body: { gap: theme.spacing[3] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
