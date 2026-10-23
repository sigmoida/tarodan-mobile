import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/ui';
import { useCartToggle } from '@/hooks/useCartToggle';
import type { CartListing } from '@/lib/cart/cartItemFromListing';

/** Icon-only on a narrow card, a text button on a wide one (`theme.containers.cardWide`). */
export type CardActionPresentation = 'icon' | 'text';

/**
 * Where the toggle sits, which picks its colours (web `ProductCardCartButton`):
 * - `card`: the listing card. Primary outline to add, filled primary once in the cart.
 * - `favorites`: the Favorites row, web's `full` footer button. Primary to add, danger once in
 *   the cart (web keeps that mapping there).
 */
export type CartButtonPlacement = 'card' | 'favorites';

const VARIANTS = {
  card: { add: 'outlinePrimary', remove: 'primary' },
  favorites: { add: 'primary', remove: 'danger' },
} as const;

/**
 * The listing card's cart toggle (web `ProductCardCartButton`): "Sepete Ekle", or "Sepetten
 * Çıkar" when the listing is already in the cart (D10).
 *
 * - Look (web parity, `placement`): on a card a primary outline (`outlinePrimary`, web
 *   `outline-primary`) while the listing is not in the cart, filled `primary` once it is; in
 *   Favorites primary, then danger. The glyph is the outline icon to add and the solid icon once in
 *   the cart (like web), so the state is carried by shape as well as colour; on the card it also
 *   follows the fill (outline glyph on the outline button, solid on the filled one).
 * - `icon`: the icon-only toggle names the listing and what a press does
 *   (`product.cardAction.*Aria`, like web). Web adds `aria-pressed`; mobile does not pair a
 *   changing label with `selected` (VoiceOver would read "remove ..., selected").
 * - `text`: the same toggle with its visible label.
 *
 * While a member's write runs the button looks busy and ignores presses (`useCartToggle`).
 */
export function ProductCardCartButton({
  listing,
  presentation,
  placement = 'card',
}: {
  listing: CartListing;
  presentation: CardActionPresentation;
  placement?: CartButtonPlacement;
}) {
  const { t } = useTranslation();
  const cart = useCartToggle(listing);
  const { inCart, isPending } = cart;
  const variant = inCart ? VARIANTS[placement].remove : VARIANTS[placement].add;
  const iconVariant = inCart ? 'solid' : 'outline';
  const testID = `product-card-cart-${listing.id}`;
  const busyStyle = isPending ? styles.busy : undefined;

  if (presentation === 'text') {
    return (
      <Button
        variant={variant}
        size="sm"
        icon="shopping-cart"
        iconVariant={iconVariant}
        onPress={cart.toggle}
        accessibilityState={{ busy: isPending }}
        style={busyStyle}
        testID={testID}
      >
        {inCart ? t('product.removeFromCart') : t('product.addToCart')}
      </Button>
    );
  }

  return (
    <IconButton
      variant={variant}
      size="sm"
      icon="shopping-cart"
      iconVariant={iconVariant}
      onPress={cart.toggle}
      accessibilityLabel={
        inCart
          ? t('product.cardAction.removeFromCartAria', { title: listing.title })
          : t('product.cardAction.addToCartAria', { title: listing.title })
      }
      // The label states what a press does ("... sepetten çıkar" once in the cart); no `selected`
      // with it, or VoiceOver reads a contradiction ("..., selected"; see the card heart).
      accessibilityState={{ busy: isPending }}
      style={busyStyle}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  // Web `aria-busy:opacity-60`: dimmed, never natively disabled (a press is simply ignored).
  busy: { opacity: 0.6 },
});
