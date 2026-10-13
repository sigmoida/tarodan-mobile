import { Pressable, View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Badge, Checkbox, IconButton, QuantityStepper, SectionCard, Text, theme } from '@/ui';
import { maxAllowedQty } from '@/stores/cartStore';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { CartController } from '../_hooks/useCart';

/**
 * Tek sepet satırı (web `CartItemCard`): seçim kutusu · görsel · başlık/satıcı/birim fiyat ·
 * stok uyarısı rozeti · adet seçici (stok sınırı) · sil · satır toplamı.
 */
export function CartItemRow({ item, f }: { item: any; f: CartController }) {
  const { t } = useTranslation();
  const itemMax = maxAllowedQty(item);
  const atMax = item.quantity >= itemMax;
  const stockKnown = item.stock != null;
  const stockWarning = f.stockWarningFor?.(item.productId) ?? null;
  const selected = f.isSelected(item.id);
  const open = () => router.push(`/product/${item.productId}`);
  const lineSubtotal = f.lineSubtotalFor?.(item.productId) ?? null;

  return (
    <SectionCard testID="cart-item-row" bodyStyle={styles.itemCard}>
      <View style={styles.itemTop}>
        {/* Seçim kutusu — ödemeye girecek satırları kullanıcı belirler; seçimi kalkan satır
            quote'a da gönderilmez. */}
        <View style={styles.selectBox}>
          <Checkbox
            testID={`cart-item-select-${item.productId}`}
            checked={selected}
            onChange={() => f.toggleSelected(item.id)}
          />
        </View>
        <Pressable onPress={open} accessibilityRole="link">
          <AppImage
            source={item.imageUrl}
            recyclingKey={String(item.id)}
            style={styles.itemImage}
          />
        </Pressable>
        <View style={styles.itemInfo}>
          <Pressable onPress={open} accessibilityRole="link">
            <Text variant="body" weight="semibold" tone="heading" numberOfLines={2}>{item.title}</Text>
          </Pressable>
          <Text variant="bodySm" tone="muted">{t('product.seller')}: {item.seller.displayName}</Text>
          {/* Birim fiyat SUNUCUDAN (`quote.items[].unitPrice`). Sepetteki `item.price` ekleme
              anında donuyor ve 24 saat saklanıyor; kampanya penceresi sepette beklerken kapanırsa
              satırda eski fiyat, özette yeni ara toplam görünürdü. Seçim dışı satırın quote
              karşılığı YOK; çıplak "—" "fiyat alınamadı" gibi okunuyordu, sebebi söylenir. */}
          {selected ? (
            <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }} testID="cart-item-unit-price">
              {formatServerPrice(f.unitPriceFor(item.productId))}
            </Text>
          ) : (
            <Text variant="bodySm" weight="medium" tone="muted" testID="cart-item-excluded">
              {t('cart.excludedFromTotal')}
            </Text>
          )}
          {/* Sunucudan gelen taze stok uyarısı — yerel sepetteki stok bilgisi ekleme anında
              donduğu için tükenen ürün ancak burada görünür. */}
          {stockWarning ? (
            <Badge variant="warning" size="sm" style={styles.stockWarning} testID="cart-item-stock-warning">
              {stockWarning}
            </Badge>
          ) : null}
        </View>
      </View>

      <View style={styles.itemBottom}>
        {selected && item.quantity > 1 && lineSubtotal != null ? (
          <Text variant="bodySm" tone="muted" style={styles.itemLineTotal}>
            {t('cart.lineTotal')}: <Text variant="bodySm" weight="semibold">{formatServerPrice(lineSubtotal)}</Text>
          </Text>
        ) : (
          <View style={styles.itemLineTotal} />
        )}
        <QuantityStepper
          value={item.quantity}
          max={itemMax}
          size="sm"
          onChange={(next) => f.handleQuantityChange(item.id, next - item.quantity)}
          decreaseLabel={t('cart.decreaseQuantity')}
          increaseLabel={t('cart.increaseQuantity')}
        />
        <IconButton
          icon="trash"
          variant="danger"
          size="sm"
          accessibilityLabel={t('cart.removeItem')}
          onPress={() => f.handleRemove(item.id)}
        />
      </View>
      {stockKnown && atMax ? (
        <Text variant="caption" tone="muted" align="right">
          {t('cart.lastStockCount', { count: itemMax })}
        </Text>
      ) : null}
    </SectionCard>
  );
}
