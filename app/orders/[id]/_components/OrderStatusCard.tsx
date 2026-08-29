import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, StatusBadge, theme } from '@/ui';
import { TimelineItem } from './TimelineItem';
import { badgeStatusOf, useOrderStatusConfig } from '../_lib/status';
import { formatDate } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';
import type { OrderView } from '../_lib/derive';

const { colors } = theme;

/** Sipariş numarası + rozet + durum timeline'ı. */
export function OrderStatusCard({ order, view }: { order: OrderDetail; view: OrderView }) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.statusHeader}>
        <View>
          <Text variant="caption" style={styles.orderNumber}>
            {t('sale.orderNumberTitle', { number: order.orderNumber })}
          </Text>
          {/* Kargo oluşmadan sunucu bu numarayı üretmiyor — satır kendini kapılıyor. */}
          {order.packageNumber ? (
            <Text variant="caption" style={styles.orderNumber}>
              {t('order.packageNumber')} {order.packageNumber}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={badgeStatusOf(order)} config={statusConfig} size="sm" />
      </View>

      <View style={styles.timeline}>
        <TimelineItem
          icon="cart"
          label={t('order.timelineCreated')}
          date={formatDate(order.createdAt)}
          isActive
        />
        <TimelineItem
          icon="card"
          label={t('order.timelinePaymentMade')}
          date={formatDate(order.paidAt)}
          isActive={view.isPaid}
        />
        <TimelineItem
          testID="order-shipped-timeline"
          icon="cube"
          label={t('order.statusShipped')}
          date={formatDate(order.shippedAt)}
          isActive={!!order.shippedAt}
        />
        <TimelineItem
          icon="checkmark-circle"
          label={t('order.statusDelivered')}
          date={formatDate(order.deliveredAt)}
          isActive={!!order.deliveredAt}
          isLast={!view.showRefundCancelStep}
        />
        {view.showRefundCancelStep && (
          <TimelineItem
            testID="order-refundcancel-timeline"
            icon={view.isCancelled ? 'close-circle' : 'arrow-undo'}
            label={view.refundCancelLabel}
            date={formatDate(view.refundCancelDate)}
            isActive
            isLast
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[3] },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] },
  orderNumber: { color: colors.text.muted },
  timeline: { marginTop: theme.spacing[2] },
});
