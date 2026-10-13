import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StatusBadge, Text, theme } from '@/ui';
import { styles } from '../_lib/styles';
import { buildStatusConfig, formatDate, formatCurrency } from '../_lib/status';
import type { Payment } from '../_lib/types';

/** Tek ödeme geçmişi satırı — foto ya da durum ikonu, açıklama/tarih/yöntem, tutar/rozet. */
export function PaymentHistoryItem({ item, onPress }: { item: Payment; onPress: (p: Payment) => void }) {
  const { t } = useTranslation();
  const statusConfig = buildStatusConfig(t);
  const statusKey = statusConfig[item.status] ? item.status : 'pending';
  const statusCfg = statusConfig[statusKey]!;

  return (
    <Pressable style={styles.paymentItem} onPress={() => onPress(item)}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.statusIconContainer, { backgroundColor: theme.colors.surface.alt }]}>
          <Ionicons name={statusCfg.icon as any} size={theme.iconSize.lg} color={statusCfg.color} />
        </View>
      )}

      <View style={styles.paymentInfo}>
        <Text variant="label" numberOfLines={1}>
          {item.description || t('checkout.title')}
        </Text>
        <Text variant="caption">{formatDate(item.createdAt)}</Text>
        {item.method ? (
          <Text variant="caption" tone="subtle">
            {item.method}
          </Text>
        ) : null}
      </View>

      <View style={styles.paymentRight}>
        <Text variant="label">{formatCurrency(item.amount)}</Text>
        <StatusBadge status={statusKey} config={statusConfig} size="sm" />
      </View>
    </Pressable>
  );
}
