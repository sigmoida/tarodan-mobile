import { Pressable, View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Badge, Checkbox, IconButton, QuantityStepper, SectionCard, Text } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { CartController } from '../_hooks/useCart';

/**
 * Tek sepet satırı (web `CartItemCard`, pazar yeri sepet kartı düzeni):
 *
 *   [☐]  [görsel]  **Satıcı** Ürün başlığı…            [🗑]
 *                  (stok uyarısı rozeti)
 *                  [– 1 +]                  1.234,50 TL
 *
 * Seçim kutusu solda dikeyde ortalı; başlık satıcı adıyla tek metin (en çok 2 satır); kaldır sağ
 * üstte; adet seçici sol altta, sunucu fiyatı sağ altta. Üstü çizili eski fiyat YALNIZ sunucu sepet
 * satırı indirim bildirirse (`originalPriceFor`; istemci fiyat türetmez, misafirde çizilmez).
 */
export function CartItemRow({ item, f }: { item: any; f: CartController }) {
  const { t } = useTranslation();
  // Tavan: sunucunun taze adedi (varsa), yoksa sepete eklerken yakalanan stok.
  const itemMax = f.maxQuantityFor(item);
  const stockWarning = f.stockWarningFor?.(item.productId) ?? null;
  const selected = f.isSelected(item.id);
  const open = () => router.push(`/product/${item.productId}`);
  const lineSubtotal = f.lineSubtotalFor?.(item.productId) ?? null;
  const originalPrice = selected ? (f.originalPriceFor?.(item.productId) ?? null) : null;
  const sellerName: string | undefined = item.seller?.displayName;

  return (
    <SectionCard testID="cart-item-row" bodyStyle={styles.itemCard}>
      {/* Seçim kutusu — ödemeye girecek satırları kullanıcı belirler; seçimi kalkan satır
          quote'a da gönderilmez. */}
      <Checkbox
        testID={`cart-item-select-${item.productId}`}
        checked={selected}
        onChange={() => f.toggleSelected(item.id)}
      />
      <Pressable onPress={open} accessibilityRole="link">
        <AppImage source={item.imageUrl} recyclingKey={String(item.id)} style={styles.itemImage} />
      </Pressable>

      <View style={styles.itemInfo}>
        <View style={styles.itemHead}>
          <Pressable onPress={open} accessibilityRole="link" style={styles.itemTitle}>
            <Text variant="bodySm" tone="body" numberOfLines={2}>
              {sellerName ? (
                <Text variant="bodySm" weight="bold" tone="heading">
                  {sellerName}{' '}
                </Text>
              ) : null}
              <Text variant="bodySm" tone="body">{item.title}</Text>
            </Text>
          </Pressable>
          <IconButton
            icon="trash"
            variant="ghost"
            size="sm"
            accessibilityLabel={t('cart.removeItem')}
            testID={`cart-item-remove-${item.productId}`}
            onPress={() => f.handleRemove(item.id)}
          />
        </View>

        {/* Sunucudan gelen taze stok uyarısı (web parite: yerelleştirilmiş "Son N ürün" /
            "Stokta yok" aynen). Yerel donmuş stoktan türetilen ayrı bir satır YOK — bayat kalıyordu. */}
        {stockWarning ? (
          <Badge variant="warning" size="xs" style={styles.stockWarning} testID="cart-item-stock-warning">
            {stockWarning}
          </Badge>
        ) : null}

        <View style={styles.itemBottom}>
          <QuantityStepper
            value={item.quantity}
            max={itemMax}
            size="sm"
            onChange={(next) => f.handleQuantityChange(item.id, next - item.quantity)}
            decreaseLabel={t('cart.decreaseQuantity')}
            increaseLabel={t('cart.increaseQuantity')}
          />
          {/* Birim fiyat SUNUCUDAN (`quote.items[].unitPrice`). Sepetteki `item.price` ekleme
              anında donuyor ve sepette süresiz bekleyebiliyor; kampanya penceresi sepette beklerken
              kapanırsa satırda eski fiyat, özette yeni ara toplam görünürdü. Seçim dışı satırın
              quote karşılığı YOK; çıplak "—" "fiyat alınamadı" gibi okunuyordu, sebebi söylenir. */}
          <View style={styles.itemPrice}>
            {selected ? (
              <>
                {originalPrice != null ? (
                  <Text
                    variant="caption"
                    tone="subtle"
                    numberOfLines={1}
                    style={styles.itemOldPrice}
                    testID="cart-item-old-price"
                  >
                    {formatServerPrice(originalPrice)}
                  </Text>
                ) : null}
                <Text
                  variant="body"
                  weight="bold"
                  style={styles.itemPriceText}
                  numberOfLines={1}
                  testID="cart-item-unit-price"
                >
                  {formatServerPrice(f.unitPriceFor(item.productId))}
                </Text>
                {item.quantity > 1 && lineSubtotal != null ? (
                  <Text variant="caption" tone="muted" numberOfLines={1} style={styles.textEnd}>
                    {t('cart.lineTotal')}:{' '}
                    <Text variant="caption" weight="semibold">{formatServerPrice(lineSubtotal)}</Text>
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="caption" weight="medium" tone="muted" style={styles.textEnd} testID="cart-item-excluded">
                {t('cart.excludedFromTotal')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </SectionCard>
  );
}
