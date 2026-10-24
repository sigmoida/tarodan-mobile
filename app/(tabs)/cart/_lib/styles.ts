import { StyleSheet } from 'react-native';
import { PAGE_GUTTER, PAGE_SECTION_GAP, theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

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
  // [seçim] [görsel] [bilgi sütunu]; seçim kutusu dikeyde ortalı.
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  itemImage: {
    width: spacing[20],
    height: spacing[20],
    borderRadius: radiusRole.productCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  // Başlık · stok rozeti · adet/fiyat satırı arasında nefes payı (8); kart bu yüzden biraz uzar.
  itemInfo: { flex: 1, minWidth: 0, alignSelf: 'stretch', gap: spacing[2] },
  // Başlık + sağ üstte kaldır.
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  itemTitle: { flex: 1, minWidth: 0 },
  // Sol altta adet, sağ altta fiyat.
  // Adet seçici ile fiyat aynı satırda, dikeyde ortalı (eski fiyat fiyatın solunda).
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: 'auto',
  },
  itemPrice: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: spacing[1] },
  itemPriceText: { color: theme.priceColor.card, textAlign: 'right' },
  itemOldPrice: { textDecorationLine: 'line-through', textAlign: 'right' },
  textEnd: { textAlign: 'right' },
  stockWarning: { alignSelf: 'flex-start' },

  // --- Özet ---
  summaryNote: { paddingVertical: spacing[2] },
  actions: { gap: spacing[2], marginTop: spacing[4] },

  // --- Sabit ödeme çubuğu (yüzen alt menünün üstünde kart) ---
  checkoutBarWrap: {
    // left / right: the readable gutter, set by `CartCheckoutBar`.
    position: 'absolute',
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
