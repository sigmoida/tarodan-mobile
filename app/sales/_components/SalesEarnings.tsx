import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
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
    <SectionCard bodyStyle={styles.earnings}>
      <View style={styles.earningItem}>
        <Text variant="bodySm" tone="muted">{t('sale.earningsCompleted')}</Text>
        <Text variant="h3" weight="bold" tone="success">{formatPrice(totalEarnings)}</Text>
      </View>
      <View style={styles.earningDivider} />
      <View style={styles.earningItem}>
        <Text variant="bodySm" tone="muted">{t('sale.earningsPending')}</Text>
        <Text variant="h3" weight="bold" style={{ color: theme.colors.warning[600]! }}>
          {formatPrice(pendingEarnings)}
        </Text>
      </View>
    </SectionCard>
  );
}
