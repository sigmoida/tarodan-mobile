import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text } from '@/ui';

/**
 * Ödeme yöntemi. Web burada kart alanlarını çizer; mobilde fiziksel ürün ödemesi PayTR'de kalır
 * (mağaza kuralı) — kart bilgisi uygulamada girilmez, "Ödeme Yap" PayTR 3D Secure sayfasını açar.
 */
export function CheckoutPaymentSection() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.paymentMethod')} testID="checkout-payment">
      <Text variant="bodySm" tone="muted">{t('checkout.paytrNotice')}</Text>
    </SectionCard>
  );
}
