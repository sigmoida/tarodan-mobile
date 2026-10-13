import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

// Sipariş grubu — SectionCard dizisi (web grup detayının telefon görünümü).
export const styles = StyleSheet.create({
  card: { gap: spacing[3] },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[3],
  },
  itemContent: { flexDirection: 'row', gap: spacing[3] },
  productImage: {
    width: spacing[16],
    height: spacing[16],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  itemInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  shipmentRow: {
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
});
