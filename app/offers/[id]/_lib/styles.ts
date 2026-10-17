import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Teklif detayı — SectionCard dizisi.
export const styles = StyleSheet.create({
  productCard: { flexDirection: 'row', gap: spacing[3] },
  productImage: {
    width: spacing[20],
    height: spacing[20],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  productBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: spacing[1] },
  statusBanner: { padding: spacing[3], borderRadius: radius.lg },
  amount: { gap: spacing[1] },
  divider: { height: 1, backgroundColor: colors.border.DEFAULT, marginVertical: spacing[2] },
  party: { gap: spacing[2] },
  partyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  actionsStack: { gap: spacing[2] },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
});
