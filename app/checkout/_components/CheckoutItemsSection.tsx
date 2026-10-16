import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SectionCard, Text, theme, Alert } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;
type Props = Pick<Ctrl, 'isBuyNow' | 'payableItems' | 'lineQuantityFor' | 'lineSubtotalFor'>;

/**
 * Ödenecek ürünler — sayfanın en üstü, "ne için ödüyorum" sorusu (web `OrderItemsCard`).
 *
 * Ayrılan satırlar burada YOK: sunucu onları fiyatlamadı, listede bırakmak "—" tutarlı bir satır
 * gösterirdi. Gerekçeleriyle birlikte `CheckoutUnavailableItems` kartında gösteriliyorlar.
 *
 * `React.memo` + dar prop'lar: adres/iletişim alanlarına yazarken (controller render'ı) bu kart
 * yeniden çizilmez; prop'lar controller'da referans-kararlı (useMemo/useCallback).
 */
export const CheckoutItemsSection = React.memo(function CheckoutItemsSection(c: Props) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.orderSummary')} testID="checkout-items">
      {c.isBuyNow ? (
        <Alert
          variant="warning"
          style={{ marginBottom: theme.spacing[4] }}
        >
          {t('checkout.buyNowNotice')}
        </Alert>
      ) : null}

      <View style={styles.itemList}>
        {c.payableItems.map((item) => (
          <View key={item.id} style={styles.item}>
            <AppImage source={item.imageUrl} style={styles.itemImage} />
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
});
