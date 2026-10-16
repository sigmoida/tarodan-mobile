import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { openExternalUrlSafely } from '@/lib/security/openExternalUrl';
import { SectionCard, Text, Button, StatusBadge, theme } from '@/ui';
import { router } from 'expo-router';
import { buildTrackingUrl } from '@/lib/shipping/tracking';
import { CopyButton } from '@/components/common/CopyButton';
import { useRefundStatusConfig } from '../_lib/status';
import { formatDate } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';
import type { OrderView } from '../_lib/derive';

const { colors, radius, spacing } = theme;

/** Kargo öncesi sipariş iptali. */
export function OrderCancelCard({
  order,
  view,
  onCancel,
  cancelPending,
}: {
  order: OrderDetail;
  view: OrderView;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const { t } = useTranslation();
  if (!(order.isBuyer && !view.isMembershipOrder && view.isPreShipment && !order.activeRefundRequest)) return null;
  return (
    <SectionCard title={t('order.cancellationSection')} bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted">
        {t('order.guestCancelIntro')}
      </Text>
      <Button
        testID="order-cancel-button"
        variant="danger"
        fullWidth
        title={t('order.cancelOrder')}
        onPress={onCancel}
        isLoading={cancelPending}
        disabled={cancelPending}
      />
    </SectionCard>
  );
}

/** Değerlendirme butonları — yalnız alıcı. */
export function OrderRatingButtons({
  order,
  view,
  onRate,
}: {
  order: OrderDetail;
  view: OrderView;
  onRate: (type: 'product' | 'seller') => void;
}) {
  const { t } = useTranslation();
  if (!(view.canRate && order.isBuyer)) return null;
  return (
    <SectionCard title={t('order.reviewSection')} bodyStyle={styles.stack}>
      {!order.hasProductRating && (
        <Button variant="outline" title={t('order.rateProduct')} onPress={() => onRate('product')} />
      )}
      {!order.hasSellerRating && (
        <Button variant="outline" title={t('order.rateSeller')} onPress={() => onRate('seller')} />
      )}
      {order.hasProductRating && order.hasSellerRating && (
        <Text variant="bodySm" style={{ color: colors.success[700]! }} align="center">
          {t('order.reviewReceivedShort')}
        </Text>
      )}
    </SectionCard>
  );
}

/** Aktif iade talebi banner'ı. */
export function OrderRefundBanner({
  order,
  view,
  onCancelRefund,
  cancelRefundPending,
}: {
  order: OrderDetail;
  view: OrderView;
  onCancelRefund: () => void;
  cancelRefundPending: boolean;
}) {
  const { t } = useTranslation();
  const refundStatusConfig = useRefundStatusConfig();
  const rr = order.activeRefundRequest;
  const returnTrackingUrl = buildTrackingUrl(rr?.returnProvider, rr?.returnTrackingNumber);
  if (!(rr && !view.isCancelled)) return null;
  return (
    <SectionCard
      title={t('order.refundRequest')}
      testID="refund-active-banner"
      bodyStyle={styles.stack}
      badge={<StatusBadge status={rr.status} config={refundStatusConfig} size="sm" />}
    >
      {rr.refundNumber ? (
        <Text variant="bodySm" tone="muted">{rr.refundNumber} · {formatDate(rr.createdAt)}</Text>
      ) : null}
      {rr.status === 'return_shipment_open' && rr.returnTrackingNumber ? (
        <View style={styles.trackingBox}>
          <Text variant="bodySm" tone="muted">
            {t('refund.dropOffAtSurat')}
          </Text>
          <View style={styles.copyRow}>
            <Text variant="body" weight="bold" tone="heading" selectable style={styles.copyValue}>
              {rr.returnTrackingNumber}
            </Text>
            <CopyButton
              testID="refund-return-tracking-copy"
              value={rr.returnTrackingNumber}
              successMessage={t('order.cargoCodeCopied')}
            />
          </View>
          {/* Link ELLE BİRLEŞTİRİLMEZ — tek kaynak `buildTrackingUrl`. */}
          {returnTrackingUrl ? (
            <Button
              variant="outline"
              title={t('order.trackOnSurat')}
              onPress={() => void openExternalUrlSafely(returnTrackingUrl)}
            />
          ) : null}
        </View>
      ) : null}
      {['pending_review', 'wait_for_delivery'].includes(rr.status) && (
        <Button
          testID="refund-cancel-button"
          variant="danger"
          title={t('refund.cancel.cta')}
          onPress={onCancelRefund}
          isLoading={cancelRefundPending}
          disabled={cancelRefundPending}
        />
      )}
    </SectionCard>
  );
}

/** Kargo sonrası iade aksiyonu (aç / süre-doldu). */
export function OrderRefundActionCard({
  order,
  view,
  onOpenRefund,
}: {
  order: OrderDetail;
  view: OrderView;
  onOpenRefund: () => void;
}) {
  const { t } = useTranslation();
  const timingValues = view.timing;
  // Pencere kapısı sunucu damgasından (`returnWindowEndsAt`) — bkz. `_lib/timing`.
  const eligible =
    order.isBuyer &&
    !view.isMembershipOrder &&
    view.isPostShipment &&
    !order.activeRefundRequest &&
    order.payment?.status === 'completed' &&
    !view.isCancelled &&
    order.status !== 'refunded';
  if (!eligible) return null;

  if (view.isPastRefundWindow) {
    return (
      <SectionCard title={t('order.refundWindowClosed')}>
        <Text variant="bodySm" tone="muted">
          {t('order.refundWindowPassed', timingValues)}
        </Text>
      </SectionCard>
    );
  }
  return (
    <SectionCard title={t('order.refundSection')} bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted">
        {t('order.refundEligibleIntro', timingValues)}
      </Text>
      <Button
        testID="refund-request-button"
        variant="outline"
        title={t('order.requestRefund')}
        onPress={onOpenRefund}
      />
    </SectionCard>
  );
}

/** Yardım kartı (web `HelpCard`: "Yardım" + bağlantı satırları). */
export function OrderHelpCard() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('nav.help')} bodyStyle={styles.stack}>
      <Button variant="ghost" title={t('payment.needHelp')} onPress={() => router.push('/help')} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[2] },
  trackingBox: { backgroundColor: colors.surface.alt, padding: spacing[3], borderRadius: radius.lg, gap: spacing[1] },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  copyValue: { flexShrink: 1 },
});
