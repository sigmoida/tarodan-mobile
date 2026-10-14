import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable, Linking, StyleSheet } from 'react-native';
import { SectionCard, Text, Button, StatusBadge, theme } from '@/ui';
import type { Shipment } from '@/lib/api';
import { CopyButton } from '@/components/common/CopyButton';
import { formatPrice } from '../_lib/format';
import { formatPolicyDate } from '@/lib/shared/timingPolicy';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { isAwaitingDropoff, shipmentStatusLabel } from '@/lib/shipping/shipmentStatus';
import { orderCancelMessage, type OrderCancelAudience } from '@/lib/shared/orderCancelMessage';
import type { OrderDetail } from '../_lib/types';
import type { OrderView } from '../_lib/derive';

const { spacing } = theme;

/** Escrow kartının göründüğü (UI) statüler — web `["delivered", "awaiting_buyer_confirmation"]`. */
const ESCROW_STATUSES: readonly string[] = ['delivered', 'awaiting_confirmation'];

/**
 * Ödeme güvencesi (escrow) kartı. İKİ AYRI TARİH: iade penceresinin sonu
 * (`returnWindowEndsAt`) ve satıcı ödeme tarihi (sunucunun hold'a yazdığı
 * `escrowReleaseAt`; yoksa pencere sonu + payout grace). Web metni ödeme
 * tarihini "teslimden N gün sonra" ve "o tarihe kadar iade" diye anlatıyordu;
 * ödeme tarihi pencere sonundan grace kadar sonra olduğu için ikisi çelişiyordu.
 * Gün sayıları `view.timing` (siparişin kendi damgası).
 */
export function OrderEscrowCard({ order, view }: { order: OrderDetail; view: OrderView }) {
  const { t } = useTranslation();
  const timingValues = view.timing;
  // Web `EscrowInfoCard` ile birebir: yalnız alıcıya, yalnız teslim edilmiş
  // (`delivered` / `awaiting_buyer_confirmation` → UI `awaiting_confirmation`)
  // ve üyelik olmayan siparişte. Kargodaki ya da tamamlanmış siparişte yok.
  if (!order.isBuyer || !ESCROW_STATUSES.includes(order.status) || view.isMembershipOrder) return null;
  return (
    <SectionCard
      title={t('order.paymentProtection')}
      testID="order-escrow-info"
      badge={
        view.hasActiveRefund ? (
          <StatusBadge
            status="frozen"
            config={{ frozen: { label: t('order.heldForRefund'), variant: 'warning' } }}
            size="sm"
          />
        ) : undefined
      }
    >
      {view.hasActiveRefund ? (
        <Text variant="bodySm" tone="muted">
          {t('order.paymentOnHoldRefund')}
        </Text>
      ) : view.payoutReleaseDate && view.refundWindowEnd ? (
        <Text variant="bodySm" tone="muted" testID="order-escrow-dates">
          {t('order.payoutReleaseWithDate', {
            ...timingValues,
            refundDeadline: formatPolicyDate(view.refundWindowEnd),
            date: formatPolicyDate(view.payoutReleaseDate),
          })}
        </Text>
      ) : (
        <Text variant="bodySm" tone="muted">
          {t('order.payoutRelease', timingValues)}
        </Text>
      )}
    </SectionCard>
  );
}

/** İptal bilgi kartı — neden iptal edildiği (kategori/gerekçe) + iade notu. */
export function OrderCancelledInfo({
  order,
  view,
  audience,
}: {
  order: OrderDetail;
  view: OrderView;
  /** Görüntüleyen — ekran `user.id`'den hesaplar (bkz. `orderCancelMessage`). */
  audience: OrderCancelAudience;
}) {
  const { t } = useTranslation();
  if (!view.isCancelled) return null;
  const cancelMessage = orderCancelMessage(order, audience, t, view.timing);
  return (
    <SectionCard title={t('order.orderCancelled')} testID="order-cancelled-info" bodyStyle={styles.stack}>
      {cancelMessage ? (
        <Text testID="order-cancel-message" variant="bodySm" tone="heading">
          {cancelMessage}
        </Text>
      ) : null}
      <Text variant="bodySm" tone="muted">
        {t('order.cancelledRefundNotice')}
      </Text>
    </SectionCard>
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
    <SectionCard title={t('order.statusPendingPayment')} bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted">{t('order.completePaymentPrompt')}</Text>
      <Button
        testID="order-pay-button"
        variant="primary"
        fullWidth
        isLoading={payPending}
        title={t('offer.payAmount', { amount: formatPrice(order.totalAmount) })}
        onPress={onPay}
      />
    </SectionCard>
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
    <SectionCard
      title={t('order.trackOrder')}
      testID="order-tracking-card"
      bodyStyle={styles.stack}
      action={
        <Text variant="bodySm" tone="muted">
          {shipmentStatusLabel(status, t)}
        </Text>
      }
    >
      {s.cargoCode ? (
        <View style={styles.stack}>
          <Text variant="bodySm" tone="muted">{t('order.trackingNumber')}</Text>
          <View style={styles.copyRow}>
            <Text variant="body" weight="medium" testID="order-tracking-number" selectable style={styles.copyValue}>
              {s.cargoCode}
            </Text>
            <CopyButton testID="order-tracking-copy" value={s.cargoCode} successMessage={t('trade.trackingCopied')} />
          </View>
          {s.trackingUrl ? (
            <Pressable onPress={() => Linking.openURL(s.trackingUrl!)} accessibilityRole="link" hitSlop={8}>
              <Text variant="bodySm" tone="primary">{t('order.trackShipment')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : isSeller ? (
        // SATICI: şubede vereceği referans + kodun ne zaman geleceği.
        <View style={styles.stack}>
          <Text variant="bodySm" tone="muted">{t('order.cargoReference')}</Text>
          <View style={styles.copyRow}>
            <Text variant="body" weight="medium" testID="order-cargo-reference" selectable style={styles.copyValue}>
              {s.reference}
            </Text>
            {s.reference ? (
              <CopyButton testID="order-cargo-reference-copy" value={s.reference} successMessage={t('order.cargoCodeCopied')} />
            ) : null}
          </View>
          <Text variant="bodySm" tone="muted">{t('order.cargoRefInstructions')}</Text>
          <Text variant="bodySm" tone="muted">{t('order.trackingAppearsAfterDropoff')}</Text>
        </View>
      ) : isAwaitingDropoff(status) ? (
        // ALICI: iç referans işine yaramaz, gösterme. Paket hâlâ satıcıdayken
        // "takip bilgileri şubeye teslimden sonra" notu doğru bilgidir.
        <Text variant="bodySm" tone="muted">{t('order.shipmentPreparingBuyer')}</Text>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[2] },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  copyValue: { flexShrink: 1 },
});
