import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, SectionCard, Text, StatusBadge, theme } from '@/ui';
import { AppImage } from '@/components/AppImage';
import { getOrderProductImageUri } from '@/utils/orderProductImage';
import { styles } from '../_lib/styles';
import { useSalesStatusConfig, saleBadgeStatus, formatDate } from '../_lib/status';
import { formatPrice, PRICE_PLACEHOLDER } from '@/utils/format';
import type { Sale } from '../_lib/types';
import type { SaleActionsController } from '../_hooks/useSaleActions';

/** Tek bir satış kartı — durum rozeti, ürün/alıcı, tutar ve durum-bazlı aksiyonlar. */
export function SaleCard({ sale, actions }: { sale: Sale; actions: SaleActionsController }) {
  const { t } = useTranslation();
  const salesStatusConfig = useSalesStatusConfig();
  const { updateStatusMutation, handleMarkAsProcessing, setShipDialog } = actions;

  return (
    <SectionCard bodyStyle={styles.saleCard}>
      <Pressable
        testID={`sale-card-${sale.id}`}
        onPress={() => router.push(`/sales/${sale.id}`)}
        style={styles.saleCard}
        accessibilityRole="button"
      >
        <View style={styles.saleHeader}>
          <Text variant="caption" tone="muted">
            #{sale.orderNumber}
          </Text>
          <StatusBadge status={saleBadgeStatus(sale)} config={salesStatusConfig} size="sm" />
        </View>

        <View style={styles.saleContent}>
          <AppImage source={getOrderProductImageUri(sale.product, 'card')} style={styles.productImage} />
          <View style={styles.saleInfo}>
            <Text variant="body" weight="medium" tone="heading" numberOfLines={1}>{sale.product.title}</Text>
            <Text variant="bodySm" tone="muted">
              {t('order.buyer')}: {sale.buyer.displayName}
            </Text>
            {sale.shippingAddress?.city ? (
              <Text variant="bodySm" tone="muted" numberOfLines={1}>
                {sale.shippingAddress.city}
              </Text>
            ) : null}
          </View>
          <View style={styles.priceSection}>
            <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
              {sale.pricing?.subtotal != null ? formatPrice(sale.pricing.subtotal) : PRICE_PLACEHOLDER}
            </Text>
            <Text variant="caption" tone="muted">{formatDate(sale.createdAt)}</Text>
          </View>
        </View>
      </Pressable>

      {/* Action Buttons */}
      {sale.status === 'paid' && (
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            title={t('order.markAsPreparing')}
            onPress={() => handleMarkAsProcessing(sale)}
            isLoading={
              updateStatusMutation.isPending &&
              updateStatusMutation.variables?.orderId === sale.id
            }
          />
        </View>
      )}

      {sale.status === 'processing' && (
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            title={t('sale.shipCta')}
            onPress={() => setShipDialog({ visible: true, order: sale })}
          />
        </View>
      )}
    </SectionCard>
  );
}
