import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Siparişlerim — web OrderGroupCard'ın telefon görünümü (çerçeveli kart, 56pt görsel, rozet + fiyat sağda).
export const styles = StyleSheet.create({
  filters: { gap: spacing[2], paddingRight: spacing[4] },
  list: { gap: spacing[3] },
  card: { gap: spacing[3] },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  line: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  image: {
    width: spacing[16] - spacing[2],
    height: spacing[16] - spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  imageSm: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  info: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[3],
  },
  footActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  rating: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  groupBand: {
    marginLeft: spacing[3],
    paddingLeft: spacing[3],
    borderLeftWidth: 2,
    borderLeftColor: colors.primary[300]!,
    gap: spacing[3],
    marginTop: spacing[3],
  },
  thumbRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
    borderWidth: 2,
    borderColor: colors.surface.elevated,
  },
  thumbOverlap: { marginLeft: -spacing[4] },
  thumbMore: { alignItems: 'center', justifyContent: 'center' },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
