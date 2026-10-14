import React from 'react';
import { StyleSheet } from 'react-native';
import { theme } from '../lib/theme';
import { Badge, type BadgeAppearance, type BadgeProps, type BadgeVariant } from './Badge';

export type ProductBadgeVariant =
  | 'sale'
  | 'new'
  | 'trade'
  | 'rare'
  | 'preorder'
  | 'limited'
  | 'sponsored'
  | 'default';

export interface ProductBadgeProps extends Omit<BadgeProps, 'variant' | 'appearance' | 'size'> {
  variant?: ProductBadgeVariant;
}

/** Ürün varyantı → genel Badge varyantı + görünüm (web `ProductBadge` ile aynı tablo). */
const TO_BADGE: Record<ProductBadgeVariant, { variant: BadgeVariant; appearance: BadgeAppearance }> = {
  sale: { variant: 'danger', appearance: 'solid' },
  new: { variant: 'success', appearance: 'solid' },
  trade: { variant: 'success', appearance: 'solid' },
  rare: { variant: 'default', appearance: 'solid' },
  preorder: { variant: 'default', appearance: 'solid' },
  limited: { variant: 'warning', appearance: 'solid' },
  sponsored: { variant: 'warning', appearance: 'solid' },
  default: { variant: 'outline', appearance: 'soft' },
};

/**
 * Ürün kartı vitrin rozeti (indirim / yeni / takas / nadir / ön sipariş / sınırlı / sponsorlu).
 * Web gibi genel `Badge`'in ince sarmalayıcısı: SOLID görünüm (görsel üstünde okunur), `xs` (12pt; fotoğraf
 * üstünde büyümez),
 * `rounded-md` (4) ve kalın yazı.
 */
export const ProductBadge: React.FC<ProductBadgeProps> = ({
  variant = 'default',
  style,
  textStyle,
  ...rest
}) => {
  const mapped = TO_BADGE[variant];
  return (
    <Badge
      variant={mapped.variant}
      appearance={mapped.appearance}
      size="xs"
      style={[styles.base, style]}
      textStyle={[styles.text, textStyle]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: theme.radius.md },
  text: { fontWeight: theme.typography.fontWeight.bold },
});
