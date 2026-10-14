import { View } from 'react-native';
import { Alert, Button, Card, StatusBadge, Text, ButtonRow } from '@/ui';
import { buildPaymentStatusConfig } from '@/lib/payment/status';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { formatDate } from '../_lib/status';
import type { Payment } from '../_lib/types';
import type { PaymentsController } from '../_hooks/usePayments';

/** Tek ödeme kartı — durum/sağlayıcı, tutar, hata, aksiyonlar (iptal/tekrar/sipariş). */
export function PaymentCard({ p, f }: { p: Payment; f: PaymentsController }) {
  const { t } = useTranslation();
  const statusConfig = buildPaymentStatusConfig(t);
  const statusKey = statusConfig[p.status] ? p.status : 'pending';

  return (
    <Card variant="bordered" style={styles.paymentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerText}>
          <Text variant="caption" weight="medium">
            {p.orderNumber ? `#${p.orderNumber}` : t('payment.orderNumberFallback', { id: p.orderId.slice(0, 8) })}
          </Text>
          {p.product?.title ? (
            <Text variant="label" numberOfLines={2}>
              {p.product.title}
            </Text>
          ) : null}
        </View>
        <Text variant="h3" tone="primary">
          {formatPrice(p.amount)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <StatusBadge status={statusKey} config={statusConfig} size="sm" />
        <Text variant="caption" weight="medium">
          {p.provider?.toUpperCase()}
        </Text>
      </View>

      <Text variant="caption" tone="subtle">
        {formatDate(p.paidAt || p.createdAt)}
      </Text>

      {p.failureReason ? (
        <Alert variant="danger">{p.failureReason}</Alert>
      ) : null}

      <ButtonRow>
        {p.status === 'pending' && (
          <Button
            variant="danger"
            size="sm"
            title={t('common.cancel')}
            onPress={() => f.handleCancel(p.id)}
          />
        )}
        {p.status === 'failed' && (
          <Button
            testID={`payment-retry-${p.id}`}
            variant="primary"
            size="sm"
            title={t('payment.retry')}
            onPress={() => f.handleRetry(p.id)}
            disabled={f.retryBusy}
            isLoading={f.retryPendingId === p.id}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          title={t('order.order')}
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: p.orderId } } as any)}
        />
      </ButtonRow>
    </Card>
  );
}
