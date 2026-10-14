import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

/** Sabit kart yüksekliği = kare görsel kenarı (pt): 96 + 16 = 112. */
const THUMB = spacing[24] + spacing[4];

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
  // Sabit boy: her kart aynı yükseklikte, görsel sabit kare.
  // [görsel — kartın sol tarafını boydan boya kaplar] [bilgi sütunu]
  cardContent: {
    flexDirection: 'row',
    height: THUMB,
  },
  // Görsel sarmalayıcısı satır yüksekliğine uzar → görsel kartın solunu boydan boya doldurur.
  imageWrap: {
    width: THUMB,
    height: THUMB,
  },
  productImage: {
    width: THUMB,
    height: THUMB,
    backgroundColor: colors.surface.alt,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
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
    flexShrink: 1,
    minWidth: 0,
    color: theme.priceColor.card,
  },
  // Fiyat ile ikonlar arasındaki esnek boşluk → ikonlar sağa dayalı.
  spacer: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'center',
  },
});
