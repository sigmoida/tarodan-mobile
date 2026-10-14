import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing, radiusRole } = theme;

/**
 * Üyelik ekranının route-local stylesheet'i. Renk/yazı tipi/gölge burada yok: yüzeyler `Card` /
 * `SectionCard` / `Alert`, metinler `Text` varyantları, düğmeler `Button` / `SegmentedButtons`.
 * Plan kartları web'in telefon düzeni gibi dikey, tam genişlik, `gap-4`.
 */
export const styles = StyleSheet.create({
  // Hata bandı
  errorBody: {
    gap: spacing[1],
    alignItems: 'flex-start',
  },
  // Bekleyen ödeme bandı (tek dokunuşla checkout'a gider) — Alert köşesiyle aynı yarıçap.
  pendingPressable: {
    borderRadius: radiusRole.card,
    overflow: 'hidden',
  },

  // Mevcut plan
  planBody: {
    gap: spacing[2],
  },
  // Abonelik özeti (dönem / sonraki ödeme ya da bitiş / kalan gün) — salt görüntüleme satırları.
  detailList: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  manageRow: {
    marginTop: spacing[1],
    paddingVertical: spacing[3],
  },
  manageRowText: {
    flex: 1,
  },

  // "Planları Keşfet" kartı
  exploreText: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0.5],
  },

  // Aylık / yıllık seçici
  toggle: {
    gap: spacing[2],
  },
  discountBadge: {
    alignSelf: 'center',
  },

  // Plan kartları: dikey liste (web `grid-cols-1 gap-4`)
  tierList: {
    gap: spacing[4],
  },

  // Plan kartı
  tierBody: {
    gap: spacing[3],
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  tierName: {
    flexShrink: 1,
  },
  tierBadge: {
    flexShrink: 0,
  },
  tierPriceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing[1],
  },
  tierFeatures: {
    gap: spacing[2.5],
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  tierFeatureIcon: {
    marginTop: spacing[0.5],
  },
  tierFeatureText: {
    flex: 1,
  },
});
