import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme, Icon } from '@/ui';
import { router } from 'expo-router';
import { formatPrice } from '@/utils/format';
import { CompareItemRow } from './CompareItemRow';
import type { TradeItem } from '../_lib/types';

const { colors, spacing } = theme;

const openProduct = (item: TradeItem) => {
  const pid = item.productId ?? item.product?.id;
  if (pid) router.push(`/product/${pid}`);
};

function ItemSide({ label, items, total }: { label: string; items: TradeItem[]; total: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.side}>
      <Text variant="overline" tone="muted">{label}</Text>
      <View style={styles.items}>
        {items.length > 0 ? (
          items.map((item) => <CompareItemRow key={item.id} item={item} onPress={() => openProduct(item)} />)
        ) : (
          <Text variant="caption" tone="subtle">{t('trade.noItemsShort')}</Text>
        )}
      </View>
      <View style={styles.totalRow}>
        <Text variant="bodySm" tone="muted">{t('trade.totalValueLabel')}</Text>
        <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
}

/** İki tarafın ürünleri + toplam değerleri; aralarındaki takas oku işlevsel ayraçtır. */
export function TradeItemsCompare({
  myItems,
  theirItems,
  myTotal,
  theirTotal,
  otherPartyName,
}: {
  myItems: TradeItem[];
  theirItems: TradeItem[];
  myTotal: number;
  theirTotal: number;
  otherPartyName: string;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard>
      <ItemSide label={t('trade.yourItems')} items={myItems} total={myTotal} />
      <View style={styles.arrowRow}>
        <View style={styles.arrowLine} />
        <Icon name="arrows-up-down" size={theme.iconSize.lg} color={colors.primary[600]!} />
        <View style={styles.arrowLine} />
      </View>
      <ItemSide label={t('trade.otherPartyItemsLabel', { name: otherPartyName })} items={theirItems} total={theirTotal} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  side: { gap: spacing[2.5] },
  items: { gap: spacing[2] },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginVertical: spacing[4] },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border.DEFAULT },
});
