import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Karşı teklif ekranının route-local stylesheet'i (monolitten birebir taşındı).
export const styles = StyleSheet.create({
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.subtle,
    marginTop: theme.spacing[2],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2.5],
    marginTop: theme.spacing[2.5],
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface.alt,
    borderRadius: theme.radius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
    padding: theme.spacing[2],
  },
  gridItemSelected: {
    borderColor: colors.primary[600]!,
    backgroundColor: colors.primary[50]!,
  },
  gridImgWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.border.DEFAULT,
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.black20,
    alignItems: 'flex-end',
  },
  checkBadge: {
    margin: theme.spacing[1.5],
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary[600]!,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapWrap: { alignItems: 'center' },
  summary: { gap: theme.spacing[1] },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  chip: {
    flex: 1,
  },
  cashInput: {
    marginTop: theme.spacing[2.5],
    backgroundColor: colors.surface.DEFAULT,
  },
  messageInput: {
    marginTop: theme.spacing[2],
    backgroundColor: colors.surface.DEFAULT,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[1],
  },
});
