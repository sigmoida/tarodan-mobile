import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Chip, SectionCard, StatusBadge, Text, theme, Icon } from '@/ui';

import { getOrderProductImageUri } from '@/utils/orderProductImage';
import type { UiOrderStatus } from '@/utils/orderStatus';
import { styles } from '../_lib/ordersStyles';
import {
  useOrderStatusConfig,
  useStatusText,
  formatOrderDate,
  formatOrderPrice,
  type Order,
  type OrderGroup,
  type FilterType,
} from '../_lib/ordersStatus';
import { OrderCard } from './OrderCard';
import type { OrdersController } from '../_hooks/useOrders';

const FILTER_ORDER: FilterType[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'completed', 'refunds'];

// ---------------------------------------------------------------------------
// Filter chips (web Tabs karşılığı — yatay kaydırılan chip'ler)
// ---------------------------------------------------------------------------
export function OrdersFilters({ f }: { f: OrdersController }) {
  const { t } = useTranslation();
  const statusText = useStatusText();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTER_ORDER.map((key) => (
        <Chip
          key={key}
          label={
            key === 'all'
              ? t('order.tabAll')
              : key === 'refunds'
                ? t('order.tabRefunds')
                : statusText(key as UiOrderStatus)
          }
          selected={f.filter === key}
          onPress={() => f.setFilter(key)}
        />
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Empty state metni (PageShell `emptyState` için)
// ---------------------------------------------------------------------------
export function useOrdersEmptyTitle(filter: FilterType): string {
  const { t } = useTranslation();
  const statusText = useStatusText();
  return filter === 'all'
    ? t('order.noOrders')
    : filter === 'refunds'
      ? t('order.noRefunds')
      : t('order.noOrdersForStatus', { status: statusText(filter as UiOrderStatus) });
}

// ---------------------------------------------------------------------------
// Multi-item group card (accordion)
// ---------------------------------------------------------------------------
export function OrderGroupCard({
  group,
  isExpanded,
  onToggle,
  onRate,
}: {
  group: OrderGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onRate: (type: 'product' | 'seller', order: Order) => void;
}) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  const itemCount = group.orders.length;
  const thumbs = group.orders.slice(0, 4);
  const extraCount = itemCount - thumbs.length;

  return (
    <View>
      {/* Özet kart — tekli sipariş kartıyla AYNI krom. Tıkla aç/kapa (accordion). */}
      <SectionCard bodyStyle={styles.card}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          style={styles.card}
        >
          <View style={styles.cardHead}>
            <Text variant="caption" tone="muted">
              {t('order.multiOrderWithCount', { count: itemCount })}
            </Text>
            <StatusBadge status={group.status} config={statusConfig} size="sm" />
          </View>

          <View style={styles.line}>
            <View style={styles.thumbRow}>
              {thumbs.map((order, idx) => (
                <Image
                  key={order.id}
                  source={{ uri: getOrderProductImageUri(order.product) }}
                  style={[styles.thumb, idx > 0 && styles.thumbOverlap]}
                />
              ))}
              {extraCount > 0 && (
                <View style={[styles.thumb, styles.thumbOverlap, styles.thumbMore]}>
                  <Text variant="caption" weight="bold" tone="muted">
                    +{extraCount}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <Text variant="caption" tone="subtle">
                {formatOrderDate(group.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.cardFoot}>
            <Text variant="bodySm" tone="muted">
              {isExpanded ? t('order.hideItems') : t('order.showItems')}
            </Text>
            <View style={styles.groupRight}>
              <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
                {formatOrderPrice(group.totalAmount)}
              </Text>
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={theme.iconSize.md}
                color={theme.colors.text.muted}
              />
            </View>
          </View>
        </Pressable>
      </SectionCard>

      {/* Açılınca: grubun ürünleri sol-bantlı bir kolonda KOMPAKT kartlar (web `border-l-2
          border-primary-300 pl-4`) → sepete ait olduğu belli olur. */}
      {isExpanded && (
        <View style={styles.groupBand}>
          {group.orders.map((order) => (
            <OrderCard key={order.id} order={order} compact onRate={onRate} />
          ))}
        </View>
      )}
    </View>
  );
}
