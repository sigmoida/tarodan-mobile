import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Alert, SectionCard, Text, StatusBadge, theme } from '@/ui';
import { useOrderStatusConfig } from '@/lib/shared/orderStatus';
import { isAwaitingDropoff, shipmentStatusLabel } from '@/lib/shipping/shipmentStatus';

import { styles } from '../_lib/styles';
import {
  getStatusInfo,
  formatTrackDate,
  getStatusSteps,
  CLOSED_TRACK_STATUSES,
  CLOSED_TRACK_HINT_KEYS,
  type OrderStatus,
} from '../_lib/status';
import { formatPrice } from '@/utils/format';

const TIMELINE = ['pending_payment', 'paid', 'preparing', 'shipped', 'delivered'];

function Row({ label, value, testID, mono }: { label: string; value: string; testID?: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySm" tone="muted">{label}</Text>
      <Text variant="bodySm" weight={mono ? 'semibold' : 'medium'} testID={testID}>{value}</Text>
    </View>
  );
}

/** Sonuç kartları: sipariş + ürün/tutar, kargo, sipariş durumu zaman çizelgesi. */
export function OrderTrackResult({ order }: { order: OrderStatus }) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  // Liste `@/lib/shipping/shipmentStatus`'te tek yerde; alıcı sipariş detayı da
  // aynı kapıyı kullanıyor (iki kopya sessizce ayrılırdı).
  const awaitingDropoff = isAwaitingDropoff(order.shipment?.status);
  const closed = CLOSED_TRACK_STATUSES.includes(order.status);
  const closedInfo = closed ? getStatusInfo(order.status, t) : null;

  return (
    <>
      <SectionCard bodyStyle={styles.stack}>
        <View style={styles.resultHead}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="semibold" tone="heading">{order.orderNumber}</Text>
            <Text variant="caption" tone="muted">{formatTrackDate(order.createdAt)}</Text>
          </View>
          <StatusBadge status={order.status} config={statusConfig} />
        </View>

        {/* Sunucunun çözdüğü diğer numaralar — kargo/grup oluşmadıysa gelmezler. */}
        {order.groupNumber ? <Row label={t('order.groupNumberLabel')} value={order.groupNumber} mono /> : null}
        {order.packageNumber ? <Row label={t('order.packageNumber')} value={order.packageNumber} mono /> : null}

        <View style={styles.rule} />
        <Text variant="bodySm" tone="muted">{t('order.product')}</Text>
        <Text variant="body" weight="medium" tone="heading">{order.product.title}</Text>

        {/* Price Info — guest-track yanıtında yalnızca toplam tutar var (kırılım yok) */}
        <View style={styles.row}>
          <Text variant="h3" tone="heading">{t('common.total')}</Text>
          <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>
            {formatPrice(order.totalAmount)}
          </Text>
        </View>
      </SectionCard>

      {/* Shipping Info */}
      {order.shipment && (
        <SectionCard title={t('order.shippingInfo')} bodyStyle={styles.stack}>
          <Row
            label={t('order.shippingCompany')}
            value={order.shipment.provider === 'surat' ? 'Sürat Kargo' : order.shipment.provider}
          />
          {/* Takip numarası GÖSTERİLMEZ: uç yalnız iç referansı (`PKG-…`)
              gönderiyor ve Sürat onu tanımaz. Yerine kargo durumu. */}
          <Row
            label={t('trade.shippingStatus.title')}
            testID="track-shipment-status"
            value={shipmentStatusLabel(order.shipment.status, t)}
          />
          {order.shipment.estimatedDelivery && (
            <Row label={t('payment.estimatedDelivery')} value={formatTrackDate(order.shipment.estimatedDelivery)} />
          )}
          {awaitingDropoff ? (
            <Text variant="caption" tone="muted">{t('order.shipmentPreparingBuyer')}</Text>
          ) : null}
        </SectionCard>
      )}

      {/* Timeline */}
      <SectionCard title={t('order.orderStatusSectionTitle')}>
        {closedInfo ? (
          <Alert
            variant={order.status === 'cancelled' ? 'danger' : order.status === 'refund_requested' ? 'warning' : 'default'}
            title={closedInfo.label}
          >
            {CLOSED_TRACK_HINT_KEYS[order.status] ? t(CLOSED_TRACK_HINT_KEYS[order.status]!) : ''}
          </Alert>
        ) : (
          <View style={styles.timeline}>
            {TIMELINE.map((status, index) => {
              const statusInfo = getStatusInfo(status, t);
              const isActive = getStatusSteps(order.status) >= index;
              const isCurrent = order.status === status;
              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
                    {index < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                    )}
                  </View>
                  <Text
                    variant="bodySm"
                    weight={isCurrent ? 'bold' : isActive ? 'medium' : 'regular'}
                    tone={isActive ? 'heading' : 'subtle'}
                  >
                    {statusInfo.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </>
  );
}
