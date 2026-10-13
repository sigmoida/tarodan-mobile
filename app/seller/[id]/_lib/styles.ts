import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Satıcı profili: web `SellerHeader` (kenarlıklı kart, MetricCard ızgarası) + sekmeler + sekme içerikleri.
export const styles = StyleSheet.create({
  header: { gap: spacing[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  identityInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  name: { flexShrink: 1 },
  actions: { flexDirection: 'row', gap: spacing[2] },
  flex: { flex: 1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  metric: {
    width: '47%',
    flexGrow: 1,
    gap: spacing[0.5],
    padding: spacing[3],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  tabs: { marginBottom: spacing[1] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  cell: { width: '48%' },
  review: { gap: spacing[1], paddingVertical: spacing[3] },
  reviewDivided: { borderTopWidth: 1, borderTopColor: colors.border.DEFAULT },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  reviewInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  stars: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
});
