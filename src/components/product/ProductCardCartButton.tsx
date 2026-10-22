import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/ui';
import { useCartToggle } from '@/hooks/useCartToggle';
import type { CartListing } from '@/lib/cart/cartItemFromListing';

/** Icon-only on a narrow card, a text button on a wide one (`theme.containers.cardWide`). */
export type CardActionPresentation = 'icon' | 'text';

/**
 * The listing card's cart toggle (web `ProductCardCartButton`): "Sepete Ekle", or "Sepetten
 * Çıkar" when the listing is already in the cart (D10).
 *
 * - `icon`: the icon-only toggle names the listing and what a press does
 *   (`product.cardAction.*Aria`, like web), with a solid icon and the danger colour once in the
 *   cart, so colour is not the only cue. Web adds `aria-pressed`; mobile does not pair a changing
 *   label with `selected` (VoiceOver would read "remove ..., selected").
 * - `text`: the same toggle with its visible label.
 *
 * While a member's write runs the button looks busy and ignores presses (`useCartToggle`).
 */
export function ProductCardCartButton({
  listing,
  presentation,
}: {
  listing: CartListing;
  presentation: CardActionPresentation;
}) {
  const { t } = useTranslation();
  const cart = useCartToggle(listing);
  const { inCart, isPending } = cart;
  const variant = inCart ? 'danger' : 'primary';
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
