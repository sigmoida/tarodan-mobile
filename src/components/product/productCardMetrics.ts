import { theme } from '@/ui';

const { spacing, typography, radiusRole, controlHeight } = theme;

/** The price row's top padding (above it, a 1pt `border.subtle` rule). */
const PRICE_TOP_PADDING = spacing[1.5];

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
    priceTopPadding: PRICE_TOP_PADDING,
    priceLineHeight: typography.fontSize.base * typography.lineHeight.normal,
    /** The price row's minimum height, its top border and padding included (web border-box `min-h-8`). */
    priceRowMinHeight: controlHeight.sm,
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
