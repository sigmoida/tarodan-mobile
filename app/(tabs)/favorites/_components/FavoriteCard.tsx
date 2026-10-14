import { View, Pressable } from 'react-native';
import { Badge, Card, IconButton, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { ProductPrice } from '@/components/product';
import type { WishlistItem } from '@/hooks/useFavorites';
import { styles } from '../_lib/styles';
import type { FavoritesScreenController } from '../_hooks/useFavoritesScreen';

const { colors } = theme;

/**
 * Tek favori satırı:
 *
 *   [görsel ]  **Satıcı adı**
 *   [boydan ]  Ürün adı (soluk, en çok 2 satır)
 *   [boya   ]  1.234,50 TL                [♥] [🛒]
 *
 * Görsel kartın solunu boydan boya kaplar. Kalp favoriden çıkarır; sepet düğmesi ürün sepette değilse
 * ekler, sepetteyse sepete gider (dolu ikon). Satışta olmayan üründe sepet yerine durum rozeti. Kalp ve
 * sepet navigasyon Pressable'ının DIŞINDA (kardeş) — iç içe dokunulabilirde ebeveyn dokunuşu yutabiliyor.
 */
export function FavoriteCard({ item, f }: { item: WishlistItem; f: FavoritesScreenController }) {
  const { t } = useTranslation();
  const { product } = item;
  const open = () => router.push(`/product/${item.productId}`);
  const isActive = product.status === 'active';
  const inCart = f.isInCart(item.productId);
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
            <IconButton
              icon="heart"
              iconVariant="solid"
              accessibilityLabel={t('favorites.removeFromFavorites')}
              size="sm"
              color={colors.danger[600]!}
              testID={`favorite-remove-${item.productId}`}
              onPress={() => f.handleRemove(item.productId)}
            />
            {isActive ? (
              <IconButton
                icon="shopping-cart"
                iconVariant={inCart ? 'solid' : 'outline'}
                accessibilityLabel={cartLabel}
                size="sm"
                color={colors.primary[600]!}
                testID={`favorite-cart-${item.productId}`}
                onPress={() => f.handleCartAction(item)}
              />
            ) : (
              <Badge variant="warning" size="xs" style={styles.statusBadge}>
                {product.status === 'sold' ? t('product.statusSold') : t('product.statusInactive')}
              </Badge>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}
