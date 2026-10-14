import { View, Pressable } from 'react-native';
import { Badge, Button, Card, IconButton, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { ProductPrice } from '@/components/product';
import type { WishlistItem } from '@/hooks/useFavorites';
import { styles } from '../_lib/styles';
import type { FavoritesScreenController } from '../_hooks/useFavoritesScreen';

const { colors } = theme;

/**
 * Tek favori satırı (pazar yeri favori kartı düzeni, yalnız elimizdeki veriyle):
 *
 *   [görsel]  **Satıcı adı**                       [♥]
 *             Ürün başlığı (soluk, en çok 2 satır)
 *             ~~eski fiyat~~ (indirimdeyse)
 *             1.234,50 TL
 *             [ Sepete Ekle ]  →  sepetteyse [ Sepete Git ]
 *
 * Kalp favoriden çıkarır. Satışta olmayan üründe sepet düğmesi yerine durum rozeti. Kalp ve sepet
 * düğmesi navigasyon Pressable'ının DIŞINDA (kardeş) — iç içe dokunulabilirde ebeveyn dokunuşu
 * yutabiliyor.
 */
export function FavoriteCard({ item, f }: { item: WishlistItem; f: FavoritesScreenController }) {
  const { t } = useTranslation();
  const { product } = item;
  const open = () => router.push(`/product/${item.productId}`);
  const isActive = product.status === 'active';
  const inCart = f.isInCart(item.productId);

  return (
    <Card variant="bordered" padding={0} style={styles.card} testID={`favorite-card-${item.productId}`}>
      <View style={styles.cardContent}>
        <Pressable onPress={open} accessibilityRole="link">
          <AppImage source={product.images} variant="card" style={styles.productImage} />
        </Pressable>

        <View style={styles.productInfo}>
          <View style={styles.headRow}>
            <Pressable onPress={open} accessibilityRole="link" style={styles.titleBlock}>
              <Text variant="bodySm" weight="bold" tone="heading" numberOfLines={1}>
                {product.seller?.displayName || t('product.seller')}
              </Text>
              <Text variant="bodySm" tone="muted" numberOfLines={2}>
                {product.title}
              </Text>
            </Pressable>
            <IconButton
              icon="heart"
              iconVariant="solid"
              accessibilityLabel={t('favorites.removeFromFavorites')}
              size="sm"
              color={colors.danger[600]!}
              testID={`favorite-remove-${item.productId}`}
              onPress={() => f.handleRemove(item.productId)}
            />
          </View>

          <ProductPrice
            product={product}
            variant="body"
            weight="bold"
            style={styles.price}
            testID={`favorite-price-${item.productId}`}
          />

          {isActive ? (
            <Button
              size="sm"
              variant="outline"
              title={inCart ? t('product.goToCart') : t('product.addToCart')}
              accessibilityLabel={inCart ? t('product.goToCart') : t('product.addToCart')}
              testID={`favorite-cart-${item.productId}`}
              style={styles.cartButton}
              onPress={() => f.handleCartAction(item)}
            />
          ) : (
            <Badge variant="warning" size="xs" style={styles.statusBadge}>
              {product.status === 'sold' ? t('product.statusSold') : t('product.statusInactive')}
            </Badge>
          )}
        </View>
      </View>
    </Card>
  );
}
