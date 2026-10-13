import { View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import { buildStatusConfig, formatDate, formatCurrency } from '../_lib/status';
import type { Payment } from '../_lib/types';
import { RawText } from '@/ui';

/** Tek ödeme geçmişi satırı — foto/statü ikonu, açıklama/tarih/yöntem, tutar/rozet. */
export function PaymentHistoryItem({ item, onPress }: { item: Payment; onPress: (p: Payment) => void }) {
  const { t } = useTranslation();
  const statusConfig = buildStatusConfig(t);
  const statusCfg = statusConfig[item.status] || statusConfig.pending;

  return (
    <TouchableOpacity style={styles.paymentItem} onPress={() => onPress(item)} activeOpacity={0.7}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.statusIconContainer, { backgroundColor: statusCfg.color + '15' }]}>
          <Ionicons name={statusCfg.icon as any} size={24} color={statusCfg.color} />
        </View>
      )}

      <View style={styles.paymentInfo}>
        <RawText style={styles.paymentDescription} numberOfLines={1}>{item.description || t('checkout.title')}</RawText>
        <RawText style={styles.paymentDate}>{formatDate(item.createdAt)}</RawText>
        {item.method ? <RawText style={styles.paymentMethod}>{item.method}</RawText> : null}
      </View>

      <View style={styles.paymentRight}>
        <RawText style={styles.paymentAmount}>{formatCurrency(item.amount)}</RawText>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
          <RawText style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</RawText>
        </View>
      </View>
    </TouchableOpacity>
  );
}
