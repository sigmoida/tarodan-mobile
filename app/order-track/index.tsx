import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Alert, Button, Input, SectionCard, Text } from '@/ui';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { PageShell } from '@/components/common/PageShell';

import { styles } from './_lib/styles';
import { useOrderTrack } from './_hooks/useOrderTrack';
import { OrderTrackResult } from './_components/OrderTrackResult';

/**
 * Misafir sipariş takibi — İNCE ekran. `useOrderTrack` form durumunu, doğrulamayı ve takip
 * POST'unu taşır; burası PageShell + form kartı + sonuç kartları + yardım kartı + iptal modalı.
 */
export default function OrderTrackScreen() {
  const { t } = useTranslation();
  const f = useOrderTrack();

  return (
    <PageShell
      title={t('mobile.guestOrderTrack')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={
        <CancelOrderModal
          isOpen={f.cancel.visible}
          onClose={f.cancel.close}
          onConfirm={f.cancel.confirm}
          willRefund={f.cancel.willRefund}
          pending={f.cancel.isPending}
        />
      }
    >
      {/* Track Form */}
      <SectionCard title={t('order.trackFormTitle')} bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">{t('order.trackFormDescription')}</Text>

        <Input
          label={t('checkout.orderNumberLabel')}
          value={f.orderNumber}
          onChangeText={f.onChangeOrderNumber}
          placeholder="ORD- / GRP- / PKG-"
          autoCapitalize="characters"
        />

        <Input
          label={t('auth.emailAddress')}
          value={f.email}
          onChangeText={f.onChangeEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t('auth.emailPlaceholder')}
        />

        {f.error ? <Alert variant="danger">{f.error}</Alert> : null}

        <Button
          variant="primary"
          fullWidth
          title={t('order.trackSubmitCta')}
          onPress={f.handleTrack}
          isLoading={f.loading}
          disabled={f.loading}
        />
      </SectionCard>

      {/* Order Result */}
      {f.order && <OrderTrackResult order={f.order} />}

      {/*
        Misafir iptali (delta 19). Web'in `GuestCancelModal`'ıyla aynı uç ve
        aynı neden listesi; kapı `canGuestCancel` — kargoya verilmiş siparişte
        hiç çizilmez.
      */}
      {f.cancel.available ? (
        <Button
          testID="guest-cancel-button"
          variant="danger"
          fullWidth
          title={t('order.guestCancelCta')}
          onPress={f.cancel.open}
          disabled={f.cancel.isPending}
        />
      ) : null}

      {/* Help Section */}
      <SectionCard title={t('order.trackHelpTitle')} bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">{t('order.trackHelpText')}</Text>
        <Button variant="outline" title={t('order.trackHelpCta')} onPress={() => router.push('/help')} />
      </SectionCard>
    </PageShell>
  );
}
