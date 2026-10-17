import { theme } from '@/ui';

const { spacing, typography, radiusRole } = theme;

/**
 * Kart geometrisi — TEK kaynak: kartın kendisi ve `SkeletonProductCard` buradan okur (iskelet →
 * kart geçişinde görsel/başlık/fiyat satırları zıplamasın). Satır yükseklikleri `Text` varyantlarıyla
 * aynı formül (yazı boyu × satır aralığı).
 */
export const PRODUCT_CARD_METRICS = {
  borderWidth: 1,
  grid: {
    radius: radiusRole.productCard,
    bodyPadding: spacing[2.5],
    titleLineHeight: typography.fontSize.sm * typography.lineHeight.tight,
    titleGap: spacing[1],
    metaLineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    metaGap: spacing[1.5],
    priceTopPadding: spacing[1.5],
    priceLineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  list: {
    radius: radiusRole.card,
    padding: spacing[3],
    gap: spacing[3],
    imageSize: spacing[20],
    titleLineHeight: typography.fontSize.base * typography.lineHeight.tight,
    priceLineHeight: typography.fontSize.lg * typography.lineHeight.snug,
  },
} as const;
