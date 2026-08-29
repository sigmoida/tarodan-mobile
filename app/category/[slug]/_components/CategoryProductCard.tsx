import { View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppImage } from '@/components/AppImage';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import { isProductOutOfStock } from '@/utils/productPrice';
import { OutOfStockOverlay } from '@/components/product';
import { safeString } from '@/utils/safeString';
import { styles } from '../_lib/styles';

const { colors } = theme;

/** Kategori grid ürün kartı. */
export function CategoryProductCard({ item }: { item: any }) {
  const { t } = useTranslation();
  const isTradeEnabled = isProductTradeOpen(item);

  return (
    <TouchableOpacity style={styles.productCard} onPress={() => router.push(`/product/${item.id}`)}>
      <View style={styles.productImageContainer}>
        <AppImage
          source={item.images}
          variant="card"
          style={[styles.productImage, isProductOutOfStock(item) && { opacity: 0.45 }]}
        />
        {isProductOutOfStock(item) && <OutOfStockOverlay />}
        {isTradeEnabled && (
          <View style={styles.tradeBadge}>
            <Ionicons name="swap-horizontal" size={12} color={colors.white} />
            <Text style={styles.tradeBadgeText}>{t('product.tradeShort')}</Text>
          </View>
        )}
        <View style={styles.likesContainer}>
          <Ionicons name="eye-outline" size={14} color={colors.text.muted} />
          <Text style={styles.likesText}>{item.viewCount || 0}</Text>
        </View>
      </View>
      <View style={styles.productContent}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productMeta}>{safeString(item.brand, t('product.brand'))} • {safeString(item.scale, '1:64')}</Text>
        <Text style={styles.productPrice}>₺{item.price?.toLocaleString('tr-TR')}</Text>
      </View>
    </TouchableOpacity>
  );
}
