import React from 'react';
import { View, Pressable } from 'react-native';
import { Badge, Card, IconButton, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { ProductPrice } from '@/components/product';
import { useProductCardAction } from '@/components/product/ProductCardAction';
import { useCartStore } from '@/stores/cartStore';
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
 * The image fills the card's left edge. The heart removes the favorite. The cart button follows the
 * shared card rule (`productCardAction`, same as web): it shows only for another seller's active,
 * in-stock listing; it adds the product, or opens the cart when it is already there (filled icon).
 * A sold or inactive listing shows a status badge in its place; an out-of-stock or own listing shows
 * nothing. The heart and cart are SIBLINGS of the navigation Pressable, not nested in it (a nested
 * pressable can swallow the parent's touch).
 */
export const FavoriteCard = React.memo(function FavoriteCard({
  item,
  onRemove,
  onCartAction,
}: {
  item: WishlistItem;
  /** Referans-kararlı olmalı (`useStableCallback`): kart `React.memo`, satırlar boşa çizilmesin. */
  onRemove: (productId: string) => void;
  onCartAction: (item: WishlistItem) => void;
}) {
  const { t } = useTranslation();
  const { product } = item;
  const open = () => router.push(`/product/${item.productId}`);
  // The shared card rule (web parity): the cart toggle only for another seller's active, in-stock listing.
  const showCart = useProductCardAction(product).kind === 'add_to_cart';
  // Kart başına selector: yalnız bu ürünün sepet durumu değişince bu kart yeniden render olur.
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === item.productId));
  const cartLabel = inCart ? t('product.goToCart') : t('product.addToCart');

  return (
    <Card variant="bordered" padding={0} style={styles.card} testID={`favorite-card-${item.productId}`}>
      <View style={styles.cardContent}>
        <Pressable onPress={open} accessibilityRole="link" style={styles.imageWrap}>
          <AppImage source={product.images} variant="card" style={styles.productImage} />
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
            {showCart ? (
              <IconButton
                icon="shopping-cart"
                iconVariant={inCart ? 'solid' : 'outline'}
                accessibilityLabel={cartLabel}
                size="sm"
                color={colors.primary[600]!}
                testID={`favorite-cart-${item.productId}`}
                onPress={() => onCartAction(item)}
              />
            ) : product.status !== 'active' ? (
              <Badge variant="warning" size="xs" style={styles.statusBadge}>
                {product.status === 'sold' ? t('product.statusSold') : t('product.statusInactive')}
              </Badge>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
});
