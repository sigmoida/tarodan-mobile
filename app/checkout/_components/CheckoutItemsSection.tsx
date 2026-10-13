import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';
import { SectionCard, Text, theme, Icon } from '@/ui';
import { transformImageUrl } from '@/utils/imageUrl';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;

/**
 * Ödenecek ürünler — sayfanın en üstü, "ne için ödüyorum" sorusu (web `OrderItemsCard`).
 *
 * Ayrılan satırlar burada YOK: sunucu onları fiyatlamadı, listede bırakmak "—" tutarlı bir satır
 * gösterirdi. Gerekçeleriyle birlikte `CheckoutUnavailableItems` kartında gösteriliyorlar.
 */
export function CheckoutItemsSection({ c }: { c: Ctrl }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.orderSummary')} testID="checkout-items">
      {c.isBuyNow ? (
        <View style={styles.noticeBox}>
          <Icon name="information-circle" size={theme.iconSize.lg} color={theme.colors.warning[800]!} />
          <Text variant="bodySm" style={{ flex: 1, color: theme.colors.warning[800]! }}>
            {t('checkout.buyNowNotice')}
          </Text>
        </View>
      ) : null}

      <View style={styles.itemList}>
        {c.payableItems.map((item) => (
          <View key={item.id} style={styles.item}>
            <Image source={{ uri: transformImageUrl(item.imageUrl) }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>
                {item.title}
              </Text>
              <Text variant="bodySm" tone="muted" numberOfLines={1}>
                {t('product.seller')}: {item.seller.displayName}
              </Text>
              {/* Adet de tutarla AYNI kaynaktan: sunucu satırı stok yüzünden azaltırsa, yerel
                  adedin yanında sunucu tutarı basmak satırı kendi içinde çelişkili gösterirdi.
                  Sunucu adet göndermediyse yerel adede dönülür. */}
              {(c.lineQuantityFor(item.productId) ?? item.quantity) > 1 ? (
                <Text variant="bodySm" tone="muted">
                  {t('checkout.quantityLabel', { count: c.lineQuantityFor(item.productId) ?? item.quantity })}
                </Text>
              ) : null}
            </View>
            {/* Satır tutarı SUNUCUDAN (`quote.items[].subtotal`, adet dahil). `item.price` sepete
                ekleme anında donuyor; kampanya sepette beklerken biterse yerel `price × quantity`
                ile sunucunun ara toplamı ayrışır. Sunucu satırı yoksa yer tutucu — yerel çarpıma
                DÜŞÜLMEZ. */}
            <View style={styles.itemPrice}>
              <Text variant="body" weight="semibold" tone="primary" testID="order-item-subtotal">
                {formatServerPrice(c.lineSubtotalFor(item.productId))}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}
