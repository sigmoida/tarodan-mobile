import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

/** Satırdaki ürün görseli (pt). */
const THUMB = spacing[24];

// Route-local stylesheet (§12) — satır kartı web Card (bordered), token'lı.
export const styles = StyleSheet.create({
  moreButton: {
    alignSelf: 'center',
    marginTop: spacing[2],
  },
  card: {
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  // [görsel — kartın sol tarafını boydan boya kaplar] [bilgi sütunu]
  cardContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  productImage: {
    width: THUMB,
    minHeight: THUMB,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.alt,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    padding: spacing[3],
    gap: spacing[1],
    justifyContent: 'space-between',
  },
  // Satıcı (kalın) üstte, ürün adı altında.
  titleBlock: {
    minWidth: 0,
  },
  // Alt satır: fiyat solda, sağında favori + sepet ikon düğmeleri.
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  price: {
    flex: 1,
    minWidth: 0,
    color: theme.priceColor.card,
  },
  statusBadge: {
    alignSelf: 'center',
  },
});
