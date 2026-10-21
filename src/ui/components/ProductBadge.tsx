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
  | 'boosted'
  | 'default';

export interface ProductBadgeProps extends Omit<BadgeProps, 'variant' | 'appearance' | 'size'> {
  variant?: ProductBadgeVariant;
}

/** Product variant -> generic Badge variant + appearance (the same table as web `ProductBadge`). */
const TO_BADGE: Record<ProductBadgeVariant, { variant: BadgeVariant; appearance: BadgeAppearance }> = {
  sale: { variant: 'danger', appearance: 'solid' },
  new: { variant: 'success', appearance: 'solid' },
  trade: { variant: 'success', appearance: 'solid' },
  rare: { variant: 'default', appearance: 'solid' },
  preorder: { variant: 'default', appearance: 'solid' },
  limited: { variant: 'warning', appearance: 'solid' },
  boosted: { variant: 'warning', appearance: 'solid' },
  default: { variant: 'outline', appearance: 'soft' },
};

/**
 * Listing card badge (sale / new / trade / rare / preorder / limited / boosted "Öne Çıkan"; ads keep
 * "Sponsorlu" outside the card). Like web, a thin wrapper over the generic `Badge`: SOLID appearance
 * (readable over the photo), `xs` (12pt; does not grow over the photo) and bold text. The corner is
 * the same as every other badge: `radiusRole.badge` (from Badge; web's `rounded-md` was aligned on
 * purpose for the one-badge-corner rule).
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
      style={style}
      textStyle={[styles.text, textStyle]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  text: { fontWeight: theme.typography.fontWeight.bold },
});
