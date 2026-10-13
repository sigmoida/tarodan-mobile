import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

// Sepet düzeni — web CartClient'ın telefon görünümü (satır kartları + özet kartı alt alta).
export const styles = StyleSheet.create({
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  selectAllCount: { flexShrink: 0 },

  // --- Satır kartı (web CartItemCard) ---
  itemCard: { gap: spacing[3] },
  itemCardUnavailable: { backgroundColor: colors.surface.alt },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  selectBox: { paddingTop: spacing[1] },
  itemImage: {
    width: spacing[24],
    height: spacing[24],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.alt,
  },
  itemInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  itemLineTotal: { flex: 1 },
  itemActions: { alignItems: 'flex-end', gap: spacing[2] },
  stockWarning: { alignSelf: 'flex-start' },

  // --- Özet ---
  summaryNote: { paddingVertical: spacing[2] },
  actions: { gap: spacing[2], marginTop: spacing[4] },

  // --- Sabit alt bar ---
  checkoutBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  checkoutTotal: { flexShrink: 1, minWidth: 0 },
  checkoutButton: { flex: 1 },
});
