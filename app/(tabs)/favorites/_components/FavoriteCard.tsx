import React from 'react';
import { View, Pressable } from 'react-native';
import { Card, IconButton, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { OutOfStockOverlay, ProductPrice } from '@/components/product';
import { useProductCardAction } from '@/components/product/ProductCardAction';
import { ProductCardCartButton } from '@/components/product/ProductCardCartButton';
import { isProductOutOfStock } from '@/utils/productPrice';
import type { WishlistItem } from '@/hooks/useFavorites';
import { styles } from '../_lib/styles';

const { colors } = theme;

/**
 * One favorites row:
 *
 *   [image ]  **Seller name**
 *   [full  ]  Product title (muted, up to 2 lines)
 *   [height]  1.234,50 TL                [heart] [cart]
 *
 * The image fills the card's left edge; an out-of-stock listing (sold, reserved, inactive or no
 * stock left) dims it under the shared "sold out" overlay, like web's card. The heart removes the
 * favorite. The cart button follows the shared card rule (`productCardAction`, same as web): only
 * for another seller's active, in-stock listing, and it is the shared listing-card toggle
 * (`ProductCardCartButton`: add, or remove when already in the cart). Otherwise the slot is empty,
 * like web. The heart and cart are SIBLINGS of the navigation Pressable, not nested in it (a nested
 * pressable can swallow the parent's touch).
 */
export const FavoriteCard = React.memo(function FavoriteCard({
  item,
  onRemove,
}: {
  item: WishlistItem;
  /** Must be referentially stable (`useStableCallback`): the card is `React.memo`. */
  onRemove: (productId: string) => void;
}) {
  const { t } = useTranslation();
  const { product } = item;
  const open = () => router.push(`/product/${item.productId}`);
  // The shared card rule (web parity): the cart toggle only for another seller's active, in-stock listing.
  const showCart = useProductCardAction(product).kind === 'add_to_cart';
  const outOfStock = isProductOutOfStock(product);

  return (
    <Card variant="bordered" padding={0} style={styles.card} testID={`favorite-card-${item.productId}`}>
      <View style={styles.cardContent}>
        <Pressable
          onPress={open}
          accessibilityRole="link"
          // Name the link (the overlay text alone would read as "STOKTA YOK, link").
          accessibilityLabel={outOfStock ? `${product.title}, ${t('product.soldOut')}` : product.title}
          style={styles.imageWrap}
        >
          <AppImage
            source={product.images}
            variant="card"
            style={[styles.productImage, outOfStock && styles.dimmed]}
          />
          {outOfStock ? <OutOfStockOverlay label={t('product.soldOut').toUpperCase()} /> : null}
        </Pressable>

        <View style={styles.productInfo}>
          <Pressable onPress={open} accessibilityRole="link" style={styles.titleBlock}>
            <Text variant="bodySm" weight="bold" tone="heading" numberOfLines={1}>
              {product.seller?.displayName || t('product.seller')}
            </Text>
            <Text variant="bodySm" tone="muted" numberOfLines={2}>
              {product.title}
            </Text>
          </Pressable>

          <View style={styles.bottomRow}>
            <ProductPrice
              product={product}
              variant="body"
              weight="bold"
              style={styles.price}
              testID={`favorite-price-${item.productId}`}
            />
            <View style={styles.spacer} />
            <IconButton
              icon="heart"
              iconVariant="solid"
              accessibilityLabel={t('favorites.removeFromFavorites')}
              size="sm"
              color={colors.danger[600]!}
              testID={`favorite-remove-${item.productId}`}
              onPress={() => onRemove(item.productId)}
            />
            {showCart ? <ProductCardCartButton listing={product} presentation="icon" /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
});
