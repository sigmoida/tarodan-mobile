import { View, Image, TouchableOpacity } from 'react-native';
import { IconButton, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { maxAllowedQty } from '@/stores/cartStore';
import { transformImageUrl, IMAGE_PLACEHOLDER } from '@/utils/imageUrl';
import { asLabel, formatServerPrice } from '@/utils/format';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import type { CartController } from '../_hooks/useCart';

const { colors } = theme;

/** Tek sepet satırı — foto/başlık/fiyat + kaldır + adet kontrolü (stok sınırı). */
export function CartItemRow({ item, f }: { item: any; f: CartController }) {
  const { t } = useTranslation();
  const itemMax = maxAllowedQty(item);
  const atMax = item.quantity >= itemMax;
  const stockKnown = item.stock != null;
  const stockWarning = f.stockWarningFor?.(item.productId) ?? null;

  return (
    <View testID="cart-item-row" style={styles.cartItem}>
      {/* Seçim kutusu — ödemeye girecek satırları kullanıcı belirler; seçimi
          kalkan satır quote'a da gönderilmez. */}
      <TouchableOpacity
        testID={`cart-item-select-${item.productId}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: f.isSelected(item.id) }}
        accessibilityLabel={t('cart.selectItem')}
        onPress={() => f.toggleSelected(item.id)}
        hitSlop={8}
        style={styles.selectBox}
      >
        <Ionicons
          name={f.isSelected(item.id) ? 'checkbox' : 'square-outline'}
          size={22}
          color={f.isSelected(item.id) ? colors.primary[600]! : colors.text.muted}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push(`/product/${item.productId}`)}>
        <Image
          source={{ uri: transformImageUrl(item.imageUrl) || IMAGE_PLACEHOLDER }}
          style={styles.itemImage}
        />
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <TouchableOpacity onPress={() => router.push(`/product/${item.productId}`)}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
        <Text style={styles.itemMeta}>{asLabel(item.brand, t('product.brand'))} • {asLabel(item.scale, '1:64')}</Text>
        <Text style={styles.itemSeller}>{t('product.seller')}: {item.seller.displayName}</Text>
        {/* Birim fiyat SUNUCUDAN (`quote.items[].unitPrice`). Sepetteki
            `item.price` ekleme anında donuyor ve 24 saat saklanıyor; ürünlerde
            kampanya penceresi var, pencere sepette beklerken kapanırsa satırda
            eski indirimli fiyat, özette yeni ara toplam görünürdü. Ayrıca
            `₺{n.toLocaleString('tr-TR')}` `formatPrice` ailesinin dışındaydı —
            aynı ekranda "₺100" ile "100,00 TL" yan yana basılıyordu. */}
        {/* Seçim dışı satırın quote karşılığı YOK; çıplak "—" basmak
            "fiyat alınamadı" gibi okunuyordu. Sebebini söyle. */}
        {f.isSelected(item.id) ? (
          <Text style={styles.itemPrice} testID="cart-item-unit-price">
            {formatServerPrice(f.unitPriceFor(item.productId))}
          </Text>
        ) : (
          <Text style={styles.itemExcluded} testID="cart-item-excluded">
            {t('cart.excludedFromTotal')}
          </Text>
        )}
        {/* Sunucudan gelen taze stok uyarısı — yerel sepetteki stok bilgisi
            ekleme anında donduğu için tükenen ürün ancak burada görünür. */}
        {stockWarning ? (
          <View style={styles.stockWarning} testID="cart-item-stock-warning">
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning[600]!} />
            <Text variant="caption" style={{ color: colors.warning[600]!, flex: 1 }}>
              {stockWarning}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.itemActions}>
        <IconButton
          icon="trash-outline"
          accessibilityLabel={t('cart.removeItem')}
          size="md"
          onPress={() => f.handleRemove(item.id)}
        />
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => f.handleQuantityChange(item.id, -1)}
            accessibilityRole="button"
            accessibilityLabel={t('cart.decreaseQuantity')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="remove" size={16} color={colors.text.heading} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.quantityButton, atMax && styles.quantityButtonDisabled]}
            disabled={atMax}
            onPress={() => f.handleQuantityChange(item.id, 1)}
            accessibilityRole="button"
            accessibilityLabel={t('cart.increaseQuantity')}
            accessibilityState={{ disabled: atMax }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={16} color={atMax ? colors.text.muted : colors.text.heading} />
          </TouchableOpacity>
        </View>
        {stockKnown && atMax ? (
          <Text style={styles.stockHint}>{t('cart.lastStockCount', { count: itemMax })}</Text>
        ) : null}
      </View>
    </View>
  );
}
