import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { Button, SectionCard, Text, theme } from '@/ui';
import { router } from 'expo-router';
import {
  formatPrice,
  formatServerPrice,
  serverAmount,
  formatOrderStatus,
  formatRelativeDate,
} from '@/utils/format';
import { AppImage } from '@/components/AppImage';
import { shipmentStatusLabel } from '@/lib/shipping/shipmentStatus';
import { PreparingDeadlineNotice } from '@/components/orders/PreparingDeadlineNotice';
import { ElogoInvoiceList } from '@/components/orders/ElogoInvoiceList';
import { CopyButton } from '@/components/common/CopyButton';
import { styles } from '../_lib/styles';
import type { SaleDetailController } from '../_hooks/useSaleDetail';

const { colors } = theme;

/** Etiket solda (muted), değer sağda — özet/alıcı/kargo satırı. */
function KV({
  label,
  value,
  valueColor,
  bold,
  testID,
  onPress,
  selectable,
  copyMessage,
}: {
  label?: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  testID?: string;
  onPress?: () => void;
  selectable?: boolean;
  /** Verilirse değerin yanında kopyala düğmesi; panoya yazınca bu toast gösterilir. */
  copyMessage?: string;
}) {
  const content = (
    <Text
      testID={testID}
      selectable={selectable}
      variant="bodySm"
      weight={bold ? 'bold' : 'medium'}
      style={[styles.kvValue, valueColor ? { color: valueColor } : null]}
    >
      {value}
    </Text>
  );
  return (
    <View style={styles.kvRow}>
      {label ? <Text variant="bodySm" tone="muted">{label}</Text> : null}
      {onPress ? <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>{content}</Pressable> : content}
      {copyMessage && value ? (
        <CopyButton testID={testID ? `${testID}-copy` : undefined} value={value} successMessage={copyMessage} />
      ) : null}
    </View>
  );
}

/** Sipariş detay gövdesi — durum, ürünler, alıcı, adres, kargo, tutar kartları. */
export function SaleDetailBody({ f }: { f: SaleDetailController }) {
  const { t, i18n } = useTranslation();
  const order = f.order;
  if (!order) return null;

  const s = f.shipmentView;
  const hasShipment = !!(s.cargoCode || s.reference);
  const p = order.pricing;
  const subtotal = p?.subtotal ?? order.subtotal;
  const shipping = p?.shippingAmount ?? order.shippingCost;
  const commission = p?.commissionAmount ?? order.commission;
  // Stopaj yalnızca kurumsal satıcıda > 0 gelir (GVK 94/19, beyannamede mahsup edilir)
  const withholding = p?.withholdingTaxAmount ?? 0;
  const net = p?.sellerNetAmount ?? order.netAmount;

  return (
    <>
      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: f.sc.bg }]}>
        <Text variant="body" weight="bold" style={{ color: f.sc.fg }}>
          {formatOrderStatus(f.displayStatus, i18n.language)}
        </Text>
        <Text variant="caption" style={{ color: f.sc.fg }}>
          {formatRelativeDate(order.createdAt, i18n.language)}
        </Text>
        {f.cancelMessage ? (
          <Text testID="sales-cancel-message" variant="caption" style={{ color: f.sc.fg }}>
            {f.cancelMessage}
          </Text>
        ) : null}
      </View>

      <PreparingDeadlineNotice notice={f.preparingNotice} style={styles.flush} />

      {/* Items */}
      <SectionCard title={t('product.title')} bodyStyle={styles.stack}>
        {(order.items || []).map((item) => (
          <Pressable
            key={item.id}
            style={styles.itemRow}
            onPress={() => router.push(`/product/${item.product?.id}`)}
            accessibilityRole="button"
          >
            <AppImage source={item.product?.imageUrl} variant="card" style={styles.itemImg} />
            <View style={styles.itemInfo}>
              <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>{item.product?.title}</Text>
              <Text variant="bodySm" tone="muted">{t('sale.quantityLabel', { count: item.quantity })}</Text>
              {/* Satır tutarı SUNUCUDAN. `price` siparişe girildiği andaki donmuş
                  kopya; adetle çarpınca tahsil edilenden sapabiliyor. Sunucu satır
                  tutarı göndermediyse çarpım uydurulmaz — birim fiyat basılır. */}
              {serverAmount(item.subtotal) != null ? (
                <Text variant="bodySm" weight="semibold" style={{ color: theme.priceColor.detail }}>
                  {formatServerPrice(item.subtotal)}
                </Text>
              ) : (
                <Text variant="bodySm" weight="semibold" style={{ color: theme.priceColor.detail }}>
                  {t('sale.unitPriceLabel', { price: formatServerPrice(item.price) })}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </SectionCard>

      {/* Buyer */}
      {order.buyer ? (
        <SectionCard title={t('order.buyer')} bodyStyle={styles.stack}>
          <KV value={order.buyer.displayName} bold />
          {order.buyer.phone ? (
            <KV value={order.buyer.phone} valueColor={colors.primary[600]!} onPress={f.handleCall} />
          ) : null}
          {order.buyer.email ? <KV value={order.buyer.email} /> : null}
        </SectionCard>
      ) : null}

      {/* Shipping Address */}
      {order.shippingAddress ? (
        <SectionCard title={t('checkout.shippingAddress')} bodyStyle={styles.stack}>
          <Text variant="body" weight="medium">{order.shippingAddress.fullName}</Text>
          <Text variant="bodySm" tone="muted">{order.shippingAddress.address}</Text>
          <Text variant="bodySm" tone="muted">
            {order.shippingAddress.district}, {order.shippingAddress.city}
            {order.shippingAddress.zipCode ? ` ${order.shippingAddress.zipCode}` : ''}
          </Text>
          <Text variant="bodySm" tone="muted">
            {t('sale.phoneLabel', { phone: order.shippingAddress.phone })}
          </Text>
        </SectionCard>
      ) : null}

      {/* Shipment — İKİ NUMARA, İKİ İŞ. Kod gelmeden satıcı ŞUBE REFERANSINI
          görür (Sürat onu tanımaz, link verilmez); kod gelince gerçek Sürat
          takip numarası + koddan KURULMUŞ link. Kalıp: `OrderTrackingCard`. */}
      <SectionCard
        testID="sales-shipment-card"
        title={t('sale.shipmentSectionTitle', { carrier: 'Sürat Kargo' })}
        bodyStyle={styles.stack}
      >
        {hasShipment ? (
          <>
            <KV value={f.isSurat ? 'Sürat Kargo' : f.shipmentProvider || 'Sürat Kargo'} bold />

            {order.shipment?.status ? (
              <KV testID="sales-shipment-status" value={shipmentStatusLabel(order.shipment.status, t)} />
            ) : null}

            {s.cargoCode ? (
              <>
                <Text variant="bodySm" tone="muted">{t('order.trackingNumber')}</Text>
                <KV
                  testID="sales-tracking-number"
                  selectable
                  bold
                  value={s.cargoCode}
                  copyMessage={t('order.cargoCodeCopied')}
                />
                {s.trackingUrl ? (
                  <Button
                    testID="sales-track-link"
                    variant="outline"
                    title={t('order.trackOnSurat')}
                    onPress={f.handleTrack}
                  />
                ) : null}
              </>
            ) : (
              <>
                <Text variant="bodySm" tone="muted">{t('order.cargoReference')}</Text>
                <KV
                  testID="sales-cargo-reference"
                  selectable
                  bold
                  value={s.reference ?? ''}
                  copyMessage={t('order.cargoCodeCopied')}
                />
                <Text variant="caption" tone="muted">{t('order.cargoRefInstructions')}</Text>
                <Text variant="caption" tone="muted">{t('order.trackingAppearsAfterDropoff')}</Text>
              </>
            )}
          </>
        ) : (
          <Text variant="caption" tone="muted">{t('sale.shipmentPendingNotice')}</Text>
        )}
      </SectionCard>

      {/* Totals */}
      <SectionCard title={t('sale.amountSummaryTitle')} bodyStyle={styles.stack}>
        {subtotal != null ? <KV label={t('checkout.subtotal')} value={formatPrice(subtotal)} /> : null}
        {shipping != null ? <KV label={t('product.shipping')} value={formatPrice(shipping)} /> : null}
        {commission != null ? (
          <KV label={t('product.commissionLine')} value={`- ${formatPrice(commission)}`} valueColor={colors.danger[600]!} />
        ) : null}
        {withholding > 0 ? (
          <KV label={t('order.withholdingTax')} value={`- ${formatPrice(withholding)}`} valueColor={colors.danger[600]!} />
        ) : null}
        <View style={styles.rule} />
        <View style={styles.kvRow}>
          <Text variant="h3" tone="heading">{net != null ? t('sale.netEarnings') : t('common.total')}</Text>
          <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>
            {formatPrice(net ?? order.totalAmount ?? 0)}
          </Text>
        </View>
      </SectionCard>

      <ElogoInvoiceList
        invoices={f.elogo.invoices}
        onOpen={f.elogo.openInvoice}
        openingId={f.elogo.openingId}
        loadFailed={f.elogo.loadFailed}
        onRetry={f.elogo.refresh}
        style={styles.flush}
      />
    </>
  );
}
