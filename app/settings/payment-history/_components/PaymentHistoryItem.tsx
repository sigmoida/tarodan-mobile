import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { PaymentResultRow } from '@/components/payment/PaymentResultCard';
import { useTranslation } from 'react-i18next';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Divider,
  Icon,
  ListRowCard,
  StatusBadge,
  Text,
  theme,
} from '@/ui';
import { styles } from '../_lib/styles';
import { buildStatusConfig, formatDate, formatCurrency } from '../_lib/status';
import type { Payment } from '../_lib/types';

/**
 * One payment history row: photo or status icon, description and date, amount and badge. A tap
 * opens the details inline under the row (the screen's Accordion keeps one row open).
 */
export function PaymentHistoryItem({ item }: { item: Payment }) {
  const { t } = useTranslation();
  const statusConfig = buildStatusConfig(t);
  const statusKey = statusConfig[item.status] ? item.status : 'pending';
  const statusCfg = statusConfig[statusKey]!;
  const badge = <StatusBadge status={statusKey} config={statusConfig} size="sm" />;

  return (
    <AccordionItem value={item.id}>
      <ListRowCard direction="column" padding={0} gap={0} style={styles.card}>
        <AccordionTrigger style={styles.trigger} testID={`payment-history-row-${item.id}`}>
          <View style={styles.row}>
            {item.imageUrl ? (
              <AppImage source={item.imageUrl} recyclingKey={String(item.id)} style={styles.productImage} />
            ) : (
              <View style={styles.statusIconContainer}>
                <Icon name={statusCfg.icon} variant="solid" size={theme.iconSize.lg} color={statusCfg.color} />
              </View>
            )}

            <View style={styles.paymentInfo}>
              <Text variant="label" numberOfLines={1}>
                {item.description}
              </Text>
              <Text variant="caption">{formatDate(item.createdAt)}</Text>
            </View>

            <View style={styles.paymentRight}>
              <Text variant="label">{formatCurrency(item.amount)}</Text>
              {badge}
            </View>
          </View>
        </AccordionTrigger>

        <AccordionContent style={styles.details} testID={`payment-history-details-${item.id}`}>
          <Divider />
          <PaymentResultRow label={t('common.amount')}>{formatCurrency(item.amount)}</PaymentResultRow>
          <PaymentResultRow label={t('common.date')}>{formatDate(item.createdAt)}</PaymentResultRow>
          <PaymentResultRow label={t('common.status')}>{badge}</PaymentResultRow>
          {item.method ? (
            <PaymentResultRow label={t('checkout.paymentMethod')}>
              <Text variant="bodySm" weight="semibold" style={styles.detailValue}>
                {item.method}
              </Text>
            </PaymentResultRow>
          ) : null}
          <PaymentResultRow label={t('common.description')}>
            <Text variant="bodySm" weight="semibold" style={styles.detailValue}>
              {item.description}
            </Text>
          </PaymentResultRow>
        </AccordionContent>
      </ListRowCard>
    </AccordionItem>
  );
}
