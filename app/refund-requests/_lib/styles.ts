import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// İade talepleri — SectionCard dizisi (liste kartları + detay kartları).
export const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: spacing[2] },
  tabChip: { flex: 1 },
  list: { gap: spacing[3] },
  card: { gap: spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  productRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  productImage: {
    width: spacing[12] + spacing[2],
    height: spacing[12] + spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  productInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  rowValue: { flex: 1, textAlign: 'right' },
  timelineRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  timelineDot: {
    width: spacing[2],
    height: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primary[600]!,
    marginTop: spacing[1.5],
  },
});
