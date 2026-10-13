import { useTranslation } from 'react-i18next';
import { View, Pressable, Linking } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SectionCard, StatusBadge, Text, Button, Alert, theme } from '@/ui';
import { router } from 'expo-router';
import { getOrderProductImageUri } from '@/utils/orderProductImage';
import { formatPrice } from '@/utils/format';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { styles } from '../_lib/styles';
import { useOrderStatusConfig, badgeStatusOf, formatDate, deriveOrderRow } from '../_lib/status';
import type { GroupDetail, GroupOrder, GroupPackage } from '../_lib/types';

/** Grup başlık kartı + (2+ üründe) ürün-bazlı iade/iptal notu. */
export function GroupHeader({ group }: { group: GroupDetail }) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  return (
    <>
      <SectionCard bodyStyle={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="medium" tone="heading">{group.groupNumber}</Text>
            <Text variant="caption" tone="muted">
              {formatDate(group.createdAt)} · {group.orders.length} {t('collection.items')}
            </Text>
          </View>
          <StatusBadge status={group.status} config={statusConfig} size="sm" />
        </View>
        <View style={[styles.headerRow, styles.totalRow]}>
          <Text variant="body" weight="medium" tone="heading">{t('common.total')}</Text>
          <Text variant="body" weight="bold" style={{ color: theme.priceColor.detail }}>
            {formatPrice(group.totalAmount)}
          </Text>
        </View>
      </SectionCard>

      {group.orders.length > 1 && (
        <Alert variant="default">{t('order.groupItemActionsNote')}</Alert>
      )}
    </>
  );
}

/** Tek ürün satırı — kendi kargo takibi + iade/iptal aksiyonu (self-gated). */
export function GroupOrderRow({ order, multi }: { order: GroupOrder; multi: boolean }) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  const d = deriveOrderRow(order);
  const open = () => router.push(`/orders/${order.id}` as any);

  return (
    <SectionCard bodyStyle={styles.card}>
      <View style={styles.headerRow}>
        <Text variant="caption" tone="muted">#{order.orderNumber}</Text>
        {/* Tek siparişli grupta öğe rozeti, üstteki grup rozetiyle aynı → yalnız 2+ siparişte göster. */}
        {multi && <StatusBadge status={badgeStatusOf(order)} config={statusConfig} size="sm" />}
      </View>
      <Pressable onPress={open} style={styles.itemContent} accessibilityRole="button">
        <AppImage source={getOrderProductImageUri(order.product, 'card')} style={styles.productImage} />
        <View style={styles.itemInfo}>
          <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>{order.product.title}</Text>
          <Text variant="bodySm" tone="muted">
            {t('refund.sellerLabel', { name: order.seller?.displayName })}
          </Text>
          <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
            {formatPrice(order.totalAmount)}
          </Text>
        </View>
      </Pressable>

      {d.showTracking && (
        <Pressable onPress={open} style={styles.shipmentRow} accessibilityRole="button">
          <Text testID="group-tracking-text" variant="bodySm" weight="semibold" tone="heading">
            {d.trackingText}
          </Text>
        </Pressable>
      )}

      {d.actionLabel && (
        <Button variant="outline" size="sm" title={d.actionLabel} onPress={open} />
      )}
    </SectionCard>
  );
}

/**
 * Satıcı-bazlı paket kırılımı (B10). Yalnızca 2+ paketli grupta gösterilir —
 * tek paketli grupta üstteki sipariş satırının kendi kargo satırı zaten aynı
 * bilgiyi taşıyor, ayrı kart tekrar olurdu (§5 DRY).
 *
 * Takip linki HER ZAMAN `deriveShipmentView` ile kurulur — sunucunun
 * `cargo.trackingUrl`'ı hiç okunmaz (bkz. `_hooks/useOrderGroup.ts`).
 */
export function GroupPackageCard({ pkg }: { pkg: GroupPackage }) {
  const { t } = useTranslation();
  const view = deriveShipmentView(pkg.cargo, pkg.cargo?.cargoCode);

  return (
    <SectionCard
      testID="group-package-card"
      bodyStyle={styles.card}
      title={
        pkg.seller
          ? t('order.sellerPackage', { name: pkg.seller.publicName || pkg.seller.displayName })
          : undefined
      }
    >
      {pkg.packageNumber && (
        <InfoRow label={t('order.packageNumber')} value={pkg.packageNumber} />
      )}
      <InfoRow label={t('checkout.shipping')} value={formatPrice(pkg.shippingCost)} />
      {view.cargoCode ? (
        <InfoRow label={t('order.trackingNumber')} value={view.cargoCode} />
      ) : view.isCodePending ? (
        <Text variant="bodySm" tone="muted">{t('shipping.codePending')}</Text>
      ) : null}
      {view.trackingUrl && (
        <Button
          variant="outline"
          size="sm"
          title={t('order.trackOnSurat')}
          onPress={() => Linking.openURL(view.trackingUrl!)}
        />
      )}
    </SectionCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySm" tone="muted">{label}</Text>
      <Text variant="bodySm" weight="semibold" tone="heading">{value}</Text>
    </View>
  );
}
