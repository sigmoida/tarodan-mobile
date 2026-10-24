import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SectionCard, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { formatCondition } from '@/utils/format';
import { getOrderProductImageUri } from '@/utils/orderProductImage';
import { formatPrice } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';

const { colors, radius, spacing } = theme;

/**
 * Product card: image, title, condition, price (web `ProductInfoCard`). A digital order sells a
 * platform service on a virtual product that has no listing page, so its card is static content
 * (no press target, no link role) and has no condition row.
 */
export function OrderProductCard({ order, isDigitalOrder }: { order: OrderDetail; isDigitalOrder: boolean }) {
  const { t, i18n } = useTranslation();
  const content = (
    <>
      <AppImage source={getOrderProductImageUri(order.product, 'card')} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>{order.product.title}</Text>
        {isDigitalOrder ? null : (
          <Text variant="bodySm" tone="muted">
            {t('product.condition')}: {formatCondition(order.product?.condition, i18n.language)}
          </Text>
        )}
        <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
          {formatPrice(order.product.price)}
        </Text>
      </View>
    </>
  );
  return (
    <SectionCard>
      {isDigitalOrder ? (
        <View testID="order-product-static" style={styles.productCard}>{content}</View>
      ) : (
        <Pressable
          testID="order-product-link"
          onPress={() => router.push(`/product/${order.product.id}`)}
          accessibilityRole="link"
          style={styles.productCard}
        >
          {content}
        </Pressable>
      )}
    </SectionCard>
  );
}

/**
 * Seller row: name and a "view seller profile" link (web `PartyCard`). The seller of a digital
 * order is the platform account, so the row is the plain name, with no link.
 */
export function OrderSellerCard({ order, isDigitalOrder }: { order: OrderDetail; isDigitalOrder: boolean }) {
  const { t } = useTranslation();
  const name = <Text variant="body" weight="medium" tone="heading">{order.seller.displayName}</Text>;
  return (
    <SectionCard>
      {isDigitalOrder ? (
        <View testID="order-seller-static">{name}</View>
      ) : (
        <Pressable
          testID="order-seller-link"
          onPress={() => router.push(`/seller/${order.seller.id}`)}
          accessibilityRole="link"
        >
          {name}
          <Text variant="bodySm" tone="primary">{t('order.viewSellerProfile')}</Text>
        </Pressable>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  productCard: { flexDirection: 'row', gap: spacing[3] },
  productImage: { width: spacing[20], height: spacing[20], borderRadius: radius.lg, backgroundColor: colors.surface.alt },
  productInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
});
