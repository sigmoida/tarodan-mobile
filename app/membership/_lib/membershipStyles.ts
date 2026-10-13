import { StyleSheet } from 'react-native';
import { theme, PAGE_GUTTER } from '@/ui';

const { spacing, radiusRole } = theme;

/** Plan kartı genişliği: ekran genişliğinin oranı (yanındaki kartın kenarı görünsün) + üst sınır. */
export const TIER_CARD_WIDTH_RATIO = 0.78;
export const TIER_CARD_MAX_WIDTH = 340;
/** Plan kartları arası boşluk — `snapToInterval` ile aynı sabitten. */
export const TIER_CARD_GAP = spacing[3];

/**
 * Üyelik ekranının route-local stylesheet'i. Renk/yazı tipi/gölge burada yok: yüzeyler `Card` /
 * `SectionCard` / `Alert`, metinler `Text` varyantları, düğmeler `Button` / `SegmentedButtons`.
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
  manageRow: {
    marginTop: spacing[1],
    paddingVertical: spacing[3],
  },
  manageRowText: {
    flex: 1,
  },

  // Aylık / yıllık seçici
  toggle: {
    gap: spacing[2],
  },
  discountBadge: {
    alignSelf: 'center',
  },

  // Plan şeridi: sayfa kenar boşluğuna taşar (kenardan kenara), içerik aynı boşlukla başlar.
  strip: {
    marginHorizontal: -PAGE_GUTTER,
  },
  stripContent: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: spacing[1],
    gap: TIER_CARD_GAP,
  },

  // Plan kartı
  tierBody: {
    flex: 1,
    gap: spacing[3],
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
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
  tierSpacer: {
    flex: 1,
  },
});
