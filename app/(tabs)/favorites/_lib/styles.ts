import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

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
  },
  // [görsel] [bilgi sütunu]
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3],
  },
  productImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: radiusRole.productCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  // Satıcı + başlık solda, kalp sağ üstte.
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    color: theme.priceColor.card,
  },
  cartButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
});
