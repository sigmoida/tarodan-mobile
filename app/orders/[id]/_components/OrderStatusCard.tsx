import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, StatusBadge, theme } from '@/ui';
import { TimelineItem } from './TimelineItem';
import { badgeStatusOf, useOrderStatusConfig } from '../_lib/status';
import { formatDate } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';
import type { OrderView } from '../_lib/derive';

/**
 * Sipariş numarası + durum rozeti + zaman çizelgesi. Zaman çizelgesi web'de yok; sade hâliyle
 * kalır (nokta + çizgi, süs ikonu yok).
 */
export function OrderStatusCard({ order, view }: { order: OrderDetail; view: OrderView }) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  return (
    <SectionCard bodyStyle={styles.body}>
      <View style={styles.statusHeader}>
        <View>
          <Text variant="bodySm" tone="muted">
            {t('sale.orderNumberTitle', { number: order.orderNumber })}
          </Text>
          {/* Kargo oluşmadan sunucu bu numarayı üretmiyor — satır kendini kapılıyor. */}
          {order.packageNumber ? (
            <Text variant="bodySm" tone="muted">
              {t('order.packageNumber')} {order.packageNumber}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={badgeStatusOf(order)} config={statusConfig} size="sm" />
      </View>

      <View>
        <TimelineItem label={t('order.timelineCreated')} date={formatDate(order.createdAt)} isActive />
        <TimelineItem label={t('order.timelinePaymentMade')} date={formatDate(order.paidAt)} isActive={view.isPaid} />
        <TimelineItem
          testID="order-shipped-timeline"
          label={t('order.statusShipped')}
          date={formatDate(order.shippedAt)}
          isActive={!!order.shippedAt}
        />
        <TimelineItem
          label={t('order.statusDelivered')}
          date={formatDate(order.deliveredAt)}
          isActive={!!order.deliveredAt}
          isLast={!view.showRefundCancelStep}
        />
        {view.showRefundCancelStep && (
          <TimelineItem
            testID="order-refundcancel-timeline"
            label={view.refundCancelLabel}
            date={formatDate(view.refundCancelDate)}
            isActive
            isLast
          />
        )}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing[4] },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
