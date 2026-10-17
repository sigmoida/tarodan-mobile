import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Misafir sipariş takibi — SectionCard dizisi (form kartı + sonuç kartları).
export const styles = StyleSheet.create({
  stack: { gap: spacing[3] },
  field: { marginBottom: spacing[1] },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  rule: { height: 1, backgroundColor: colors.border.DEFAULT },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: spacing[3], minHeight: spacing[8] },
  timelineRail: { alignItems: 'center', width: spacing[4] },
  timelineDot: {
    width: spacing[3],
    height: spacing[3],
    borderRadius: radius.full,
    backgroundColor: colors.border.DEFAULT,
    marginTop: spacing[1],
  },
  timelineDotActive: { backgroundColor: colors.primary[600]! },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border.DEFAULT, marginVertical: spacing[1] },
  timelineLineActive: { backgroundColor: colors.primary[600]! },
});
