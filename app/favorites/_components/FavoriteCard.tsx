import { View, Pressable } from 'react-native';
import { Badge, Text, Card, IconButton, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import type { WishlistItem } from '@/hooks/useFavorites';
import { styles } from '../_lib/styles';
import type { FavoritesScreenController } from '../_hooks/useFavoritesScreen';

const { colors } = theme;

/** Tek favori ürün satırı — foto/başlık/fiyat/durum + kalp/sepet aksiyonları. */
export function FavoriteCard({ item, f }: { item: WishlistItem; f: FavoritesScreenController }) {
  const { t } = useTranslation();
  return (
    <Card variant="bordered" padding={0} style={styles.card}>
      {/* Aksiyon butonları navigasyon Pressable'ının DIŞINDA (kardeş) —
          iç içe dokunulabilirlerde ebeveyn dokunuşu yutabiliyor (sepet ekranı deseni). */}
      <View style={styles.cardContent}>
        <Pressable style={styles.cardMain} onPress={() => router.push(`/product/${item.productId}`)}>
          <AppImage source={item.product.images} variant="card" style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text variant="label" numberOfLines={2}>{item.product.title}</Text>
            <Text variant="caption">
              {item.product.seller?.displayName || t('product.seller')}
            </Text>
            <Text variant="h3" tone="primary">{f.formatPrice(item.product.price)}</Text>

            {item.product.status !== 'active' && (
              <View style={styles.statusBadge}>
                <Badge variant="warning" size="sm">
                  {item.product.status === 'sold' ? t('product.statusSold') : t('product.statusInactive')}
                </Badge>
              </View>
            )}
          </View>
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          <IconButton
            icon="heart"
            accessibilityLabel={t('favorites.removeFromFavorites')}
            size="md"
            color={colors.danger[600]!}
            onPress={() => f.handleRemove(item.productId)}
          />
          {item.product.status === 'active' && (
            <IconButton
              icon={f.isInCart(item.productId) ? 'cart' : 'cart-outline'}
              accessibilityLabel={f.isInCart(item.productId) ? t('product.removeFromCart') : t('product.addToCart')}
              size="md"
              color={colors.primary[600]!}
              onPress={() => f.handleToggleCart(item)}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
