import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/ui';
import { Form } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useTimingPolicy } from '@/hooks/useTimingPolicy';
import { orderTimingValues } from './_lib/timing';
import { useOrder } from './_hooks/useOrder';
import { useRefundForm } from './_hooks/useRefundForm';
import { RefundFormFields } from './_components/RefundFormFields';

/**
 * İade talebi — düz stack ekranı (sipariş detayındaki "İade Talep Et" iter).
 * Eskiden modaldı; galeri seçici artık bir Modal'ın üstünde açılmıyor (iOS sunum
 * çakışması bitti). Form + mutasyon `useRefundForm`'da; gönder alt çubukta, klavyenin
 * üstünde. Başarı: geri çık + toast; hata: alan altında / toast.error, ekran kalır.
 */
export default function RefundRequestScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = String(id);
  const { data: order, isLoading } = useOrder(orderId);
  const policy = useTimingPolicy();
  const orderQuantity = order?.quantity ?? 1;
  const refund = useRefundForm(orderId, orderQuantity);
  const title = t('order.requestRefundTitle');

  if (isLoading) return <PageShell title={title} loading />;
  if (!order) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'receipt-percent',
          title: t('order.orderNotFound'),
          subtitle: t('emptyState.notFoundHint'),
          actionLabel: t('common.goBack'),
          onAction: goBackOrHome,
        }}
      />
    );
  }

  return (
    <Form form={refund.form}>
      <PageShell
        title={title}
        testID="refund-request-screen"
        footer={
          <Button
            testID="refund-submit-button"
            variant="primary"
            size="lg"
            fullWidth
            title={t('order.submitRefund')}
            onPress={refund.onSubmit}
            isLoading={refund.busy}
            disabled={refund.busy}
          />
        }
      >
        <RefundFormFields
          refund={refund}
          orderQuantity={orderQuantity}
          timingValues={orderTimingValues(order, policy)}
        />
      </PageShell>
    </Form>
  );
}
