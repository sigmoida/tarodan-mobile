import { theme } from '@/ui';
import type { WebStatusVariant } from './status-variant';

const { colors } = theme;

/**
 * Durum varyantı → düz renkler. Rozet (`Badge`) kendi rengini bilir; bu
 * yardımcı rozet OLMAYAN durum yüzeyleri içindir (banner, adım ikonu, kart
 * şeridi) ve onlara da AYNI anlam renklerini verir. Web'deki rollerle aynı:
 * `default` marka tonu, `outline` nötr.
 */
const BY_VARIANT: Record<WebStatusVariant, { bg: string; fg: string; solid: string }> = {
  default: { bg: colors.primary[50]!, fg: colors.primary[700]!, solid: colors.primary[600]! },
  success: { bg: colors.success[50]!, fg: colors.success[600]!, solid: colors.success[600]! },
  warning: { bg: colors.warning[50]!, fg: colors.warning[600]!, solid: colors.warning[600]! },
  danger: { bg: colors.danger[50]!, fg: colors.danger[600]!, solid: colors.danger[600]! },
  outline: { bg: colors.surface.alt, fg: colors.text.muted, solid: colors.gray[500]! },
};

/** Banner/yüzey renkleri: açık zemin + okunur yazı. */
export function statusVariantColors(variant: WebStatusVariant = 'outline'): { bg: string; fg: string } {
  const { bg, fg } = BY_VARIANT[variant] ?? BY_VARIANT.outline;
  return { bg, fg };
}

/** Dolu zemin (beyaz yazı/ikon ile) ya da tek renk ikon için. */
export function statusVariantSolid(variant: WebStatusVariant = 'outline'): string {
  return (BY_VARIANT[variant] ?? BY_VARIANT.outline).solid;
}
