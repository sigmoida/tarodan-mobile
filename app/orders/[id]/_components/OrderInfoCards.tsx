import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable, Linking, StyleSheet } from 'react-native';
import { Card, Text, Button, StatusBadge, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import type { Shipment } from '@/lib/api';
import { formatDate, formatPrice } from '../_lib/format';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { isAwaitingDropoff, shipmentStatusLabel } from '@/lib/shipping/shipmentStatus';
import type { OrderDetail } from '../_lib/types';
import type { OrderView } from '../_lib/derive';

const { colors } = theme;

/** Ödeme güvencesi (escrow) kartı. */
export function OrderEscrowCard({ order, view }: { order: OrderDetail; view: OrderView }) {
  const { t } = useTranslation();
  if (
    !(order.isBuyer !== false && !view.isMembershipOrder && view.isPostShipment && !view.isCancelled && order.status !== 'refunded')
  )
    return null;
  return (
    <Card variant="elevated" style={styles.card} testID="order-escrow-info">
      <View style={styles.escrowHeaderRow}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.info[600]!} />
        <Text variant="label" style={styles.escrowHeaderText}>{t('order.paymentProtection')}</Text>
        {view.hasActiveRefund && (
          <StatusBadge
            status="frozen"
            config={{ frozen: { label: t('order.heldForRefund'), variant: 'warning' } }}
            size="sm"
          />
        )}
      </View>
      {view.hasActiveRefund ? (
        <Text variant="caption" style={styles.escrowText}>
          {t('order.paymentOnHoldRefund')}
        </Text>
      ) : view.payoutReleaseDate ? (
        <Text variant="caption" style={styles.escrowText}>
          {t('order.payoutReleaseWithDate', { date: formatDate(view.payoutReleaseDate.toISOString()) })}
        </Text>
      ) : (
        <Text variant="caption" style={styles.escrowText}>
          {t('order.payoutRelease')}
        </Text>
      )}
    </Card>
  );
}

/** İptal bilgi kartı. */
export function OrderCancelledInfo({ view }: { view: OrderView }) {
  const { t } = useTranslation();
  if (!view.isCancelled) return null;
  return (
    <Card variant="elevated" style={styles.card} testID="order-cancelled-info">
      <View style={styles.cancelledHeaderRow}>
        <Ionicons name="close-circle-outline" size={20} color={colors.danger[600]!} />
        <Text variant="label" style={styles.cancelledHeaderText}>{t('order.orderCancelled')}</Text>
      </View>
      <Text variant="caption" style={styles.escrowText}>
        {t('order.cancelledRefundNotice')}
      </Text>
    </Card>
  );
}

/** Ödeme bekliyor kartı — "Ödeme Yap" butonu. */
export function OrderPayPendingCard({
  order,
  view,
  onPay,
  payPending,
}: {
  order: OrderDetail;
  view: OrderView;
  onPay: () => void;
  payPending: boolean;
}) {
  const { t } = useTranslation();
  if (!(order.status === 'pending' && !view.isPaid && order.isBuyer !== false)) return null;
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" style={styles.sectionTitle}>{t('order.statusPendingPayment')}</Text>
      <Text variant="caption" style={styles.confirmNote}>{t('order.completePaymentPrompt')}</Text>
      <Button
        testID="order-pay-button"
        variant="primary"
        fullWidth
        isLoading={payPending}
        title={t('offer.payAmount', { amount: formatPrice(order.totalAmount) })}
        onPress={onPay}
        style={{ marginTop: theme.spacing[3] }}
      />
    </Card>
  );
}

/**
 * Kargo takip kartı — İKİ NUMARA, İKİ İŞ:
 *   - `cargoCode` (`providerTrackingId`): gerçek Sürat kodu, HER İKİ TARAFA
 *     gösterilir (+ link).
 *   - `reference` (`trackingNumber`, `PKG-…`): Tarodan iç referansı, YALNIZ
 *     satıcıya (şubede vereceği numara). Alıcı işine yaramaz, hiç gösterilmez.
 * `trackingUrl` sunucudan OKUNMAZ — `deriveShipmentView` koddan kurar.
 */
export function OrderTrackingCard({
  order, view, shipment, isSeller,
}: {
  order: OrderDetail;
  view: OrderView;
  shipment: Shipment | null;
  isSeller: boolean;
}) {
  const { t } = useTranslation();
  const s = deriveShipmentView(shipment, order.shipment?.cargoCode);
  // Kargo kaydı hiç yoksa çizecek bir şey yok.
  if (!shipment && !s.cargoCode) return null;

  // Başlıktaki durum ile gövdedeki metin AYNI kaynaktan okunur; ayrılırlarsa
  // kart kendini yalanlar ("Teslim edildi" + "paketiniz hazırlanıyor").
  const status = shipment?.status ?? order.shipment?.status;

  return (
    <Card variant="elevated" style={styles.card} testID="order-tracking-card">
      <View style={styles.trackingHeaderRow}>
        <Text variant="label" style={styles.sectionTitle}>{t('order.trackOrder')}</Text>
        <Text variant="caption" tone="muted">
          {shipmentStatusLabel(status, t)}
        </Text>
      </View>

      {s.cargoCode ? (
        <View style={styles.trackingInfo}>
          <Text variant="caption" tone="muted">{t('order.trackingNumber')}</Text>
          <Text testID="order-tracking-number">{s.cargoCode}</Text>
          {s.trackingUrl ? (
            <Pressable onPress={() => Linking.openURL(s.trackingUrl!)}>
              <Text style={styles.trackLink}>{t('order.trackShipment')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : isSeller ? (
        // SATICI: şubede vereceği referans + kodun ne zaman geleceği.
        <View style={styles.trackingInfo}>
          <Text variant="caption" tone="muted">{t('order.cargoReference')}</Text>
          <Text testID="order-cargo-reference">{s.reference}</Text>
          <Text variant="caption" tone="muted">{t('order.cargoRefInstructions')}</Text>
          <Text variant="caption" tone="muted">{t('order.trackingAppearsAfterDropoff')}</Text>
        </View>
      ) : isAwaitingDropoff(status) ? (
        // ALICI: iç referans işine yaramaz, gösterme. Paket hâlâ satıcıdayken
        // "takip bilgileri şubeye teslimden sonra" notu doğru bilgidir.
        <Text variant="caption" tone="muted">{t('order.shipmentPreparingBuyer')}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[3] },
  sectionTitle: { marginBottom: theme.spacing[3], color: colors.text.heading },
  confirmNote: { textAlign: 'center', color: colors.text.muted },
  escrowHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1.5] },
  escrowHeaderText: { flex: 1, color: colors.text.heading },
  escrowText: { color: colors.text.muted, lineHeight: 18 },
  cancelledHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1.5] },
  cancelledHeaderText: { flex: 1, color: colors.text.heading },
  trackingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
  trackingInfo: { marginTop: theme.spacing[1] },
  trackLink: { color: colors.primary[600]!, marginTop: theme.spacing[1] },
});
