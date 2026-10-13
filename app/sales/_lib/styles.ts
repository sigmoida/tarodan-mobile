import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Satışlarım — SectionCard dizisi (orders listesiyle aynı dil).
export const styles = StyleSheet.create({
  header: { gap: spacing[4], marginBottom: spacing[1] },
  earnings: { flexDirection: 'row', alignItems: 'center' },
  earningItem: { flex: 1, alignItems: 'center', gap: spacing[1] },
  earningDivider: { width: 1, height: spacing[10], backgroundColor: colors.border.DEFAULT },
  filters: { gap: spacing[2], paddingRight: spacing[4] },
  list: { gap: spacing[3] },
  saleCard: { gap: spacing[3] },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  saleContent: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  productImage: {
    width: spacing[16] - spacing[4],
    height: spacing[16] - spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  saleInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  priceSection: { alignItems: 'flex-end', gap: spacing[0.5] },
  actionButtons: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
});
