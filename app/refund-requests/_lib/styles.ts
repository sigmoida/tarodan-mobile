import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

export const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  tabChip: { flex: 1 },
  readonlyNote: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'flex-start',
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[3],
    padding: theme.spacing[3],
    backgroundColor: colors.info[50]!,
    borderRadius: theme.radius.lg,
  },
  readonlyNoteText: { flex: 1, color: colors.info[700]! },
  container: { flex: 1, backgroundColor: colors.surface.alt },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8], backgroundColor: colors.surface.DEFAULT },
  title: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  subtitle: { textAlign: 'center', marginBottom: theme.spacing[6] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8] },
  emptyTitle: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  emptySubtitle: { textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
  card: { marginBottom: theme.spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
  orderNumber: { color: colors.text.muted },
  cardBody: { gap: theme.spacing[1] },
  productRow: { flexDirection: 'row', gap: theme.spacing[2.5], alignItems: 'center' },
  productImage: { width: 52, height: 52, borderRadius: theme.radius.xl, backgroundColor: colors.surface.alt },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: theme.spacing[0.5] },
  muted: { color: colors.text.muted },
  amount: { marginTop: theme.spacing[1.5], color: colors.primary[600]! },
  actions: { flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[3.5] },
  actionBtn: { flex: 1 },
});
