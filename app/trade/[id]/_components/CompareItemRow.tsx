import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { AppImage } from '@/components/AppImage';
import { formatPrice } from '@/utils/format';
import type { TradeItem } from '../_lib/types';

const { colors, radius, spacing } = theme;

export function CompareItemRow({ item, onPress }: { item: TradeItem; onPress: () => void }) {
  const { t } = useTranslation();
  const qty = Number(item.quantity) || 1;
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="link">
      <AppImage
        source={item.productImages?.[0] ?? item.productImage ?? item.product?.images}
        variant="card"
        style={styles.thumb}
      />
      <View style={styles.info}>
        <Text variant="bodySm" weight="medium" numberOfLines={1}>
          {item.productTitle || item.product?.title || t('order.product')}
        </Text>
        <Text variant="caption" tone="muted">
          {qty}x · {formatPrice(item.valueAtTrade)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface.alt,
    borderRadius: radius.lg,
    padding: spacing[2],
  },
  thumb: { width: spacing[12], height: spacing[12], borderRadius: radius.lg, backgroundColor: colors.border.subtle },
  info: { flex: 1 },
});
