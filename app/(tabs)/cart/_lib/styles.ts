import { StyleSheet } from 'react-native';
import { PAGE_GUTTER, PAGE_SECTION_GAP, theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

// Sepet düzeni — web CartClient'ın telefon görünümü (satır kartları + özet kartı alt alta).
export const styles = StyleSheet.create({
  // Kaydırılan gövde: sayfa kenar boşluğu + bölüm aralığı (PageShell scroll gövdesiyle aynı).
  content: { flexGrow: 1, padding: PAGE_GUTTER, gap: PAGE_SECTION_GAP },
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

  // --- Sabit ödeme çubuğu (yüzen alt menünün üstünde kart) ---
  checkoutBarWrap: {
    position: 'absolute',
    left: PAGE_GUTTER,
    right: PAGE_GUTTER,
    padding: spacing[3],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    ...theme.shadow.soft,
  },
  checkoutBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  checkoutTotal: { flexShrink: 1, minWidth: 0 },
  checkoutButton: { flex: 1 },
});
