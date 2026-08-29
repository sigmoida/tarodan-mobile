import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text } from '@/ui';
import { styles } from '../_lib/styles';
import { formatPrice } from '@/utils/format';

/** Filtreden bağımsız kazanç özeti (tamamlanan + bekleyen). */
export function SalesEarnings({
  totalEarnings,
  pendingEarnings,
}: {
  totalEarnings: number;
  pendingEarnings: number;
}) {
  const { t } = useTranslation();
  return (
    <Card variant="elevated" style={styles.earningsCard}>
      <View style={styles.earningsContent}>
        <View style={styles.earningItem}>
          <Text variant="caption" style={styles.earningLabel}>{t('sale.earningsCompleted')}</Text>
          <Text variant="h3" style={styles.earningValue}>{formatPrice(totalEarnings)}</Text>
        </View>
        <View style={styles.earningDivider} />
        <View style={styles.earningItem}>
          <Text variant="caption" style={styles.earningLabel}>{t('sale.earningsPending')}</Text>
          <Text variant="h3" style={styles.earningValuePending}>{formatPrice(pendingEarnings)}</Text>
        </View>
      </View>
    </Card>
  );
}
