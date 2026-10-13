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

/** Ürün kartı: görsel · başlık · durum · fiyat (web `ProductInfoCard`). */
export function OrderProductCard({ order }: { order: OrderDetail }) {
  const { t, i18n } = useTranslation();
  return (
    <SectionCard>
      <Pressable onPress={() => router.push(`/product/${order.product.id}`)} style={styles.productCard}>
        <AppImage source={getOrderProductImageUri(order.product, 'card')} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>{order.product.title}</Text>
          <Text variant="bodySm" tone="muted">
            {t('product.condition')}: {formatCondition(order.product?.condition, i18n.language)}
          </Text>
          <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
            {formatPrice(order.product.price)}
          </Text>
        </View>
      </Pressable>
    </SectionCard>
  );
}

/** Satıcı satırı: ad + "satıcı profilini gör" bağlantısı (web `PartyCard`). */
export function OrderSellerCard({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  return (
    <SectionCard>
      <Pressable onPress={() => router.push(`/seller/${order.seller.id}`)} accessibilityRole="link">
        <Text variant="body" weight="medium" tone="heading">{order.seller.displayName}</Text>
        <Text variant="bodySm" tone="primary">{t('order.viewSellerProfile')}</Text>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  productCard: { flexDirection: 'row', gap: spacing[3] },
  productImage: { width: spacing[20], height: spacing[20], borderRadius: radius.lg, backgroundColor: colors.surface.alt },
  productInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
});
