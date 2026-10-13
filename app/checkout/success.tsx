import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, SectionCard, Text } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useHardwareBackToHome } from '@/hooks/useBlockHardwareBack';
import { PaymentResultCard, PaymentResultRow } from '@/components/payment/PaymentResultCard';

/**
 * Sipariş alındı — sade onay (web ödeme sonucu düzeni: durum dairesi, başlık, açıklama, eylemler).
 * Eski bilgi kartı (e-posta / takip / satıcı iletişimi süs ikonlarıyla) kalktı; metin açıklamada.
 */
export default function CheckoutSuccessScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  // Sipariş verildi: geri tuşu ödeme adımlarına DÖNMEZ — ana sayfaya.
  useHardwareBackToHome();

  return (
    <PageShell title={t('checkout.title')} showBack={false}>
      <PaymentResultCard
        tone="success"
        title={t('order.receivedTitle')}
        description={t('checkout.successDescription')}
        actions={
          <>
            <Button
              variant="primary"
              title={t('checkout.viewMyOrders')}
              fullWidth
              onPress={() => router.replace('/orders')}
            />
            <Button
              variant="outline"
              title={t('cart.continueShopping')}
              fullWidth
              onPress={() => router.replace('/(tabs)')}
            />
          </>
        }
      >
        {orderId ? (
          <SectionCard title={t('payment.detailsTitle')}>
            <PaymentResultRow label={t('checkout.orderNumberLabel')}>{`#${orderId}`}</PaymentResultRow>
          </SectionCard>
        ) : null}
        <Text variant="bodySm" tone="muted" align="center">
          {t('order.detailsEmailed')}
        </Text>
        <Text variant="bodySm" tone="muted" align="center">
          {t('checkout.supportQuestion')}{' '}
          <Text variant="bodySm" tone="primary" weight="medium" onPress={() => router.push('/support')}>
            {t('checkout.getSupport')}
          </Text>
        </Text>
      </PaymentResultCard>
    </PageShell>
  );
}
