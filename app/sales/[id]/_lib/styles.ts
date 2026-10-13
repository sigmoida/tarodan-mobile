import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Satış detayı — SectionCard dizisi.
export const styles = StyleSheet.create({
  statusBanner: {
    padding: spacing[3],
    borderRadius: radius.lg,
    gap: spacing[0.5],
  },
  /** Ortak kart bileşenlerinin kendi alt boşluğu — burada `gap` var. */
  flush: { marginBottom: 0 },
  stack: { gap: spacing[2] },
  itemRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  itemImg: {
    width: spacing[16] - spacing[2],
    height: spacing[16] - spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  itemInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  kvValue: { flexShrink: 1, textAlign: 'right' },
  rule: { height: 1, backgroundColor: colors.border.DEFAULT },
});
