import { useTranslation } from 'react-i18next';
import React from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/ui';
import { OrderSummaryLines } from '@/components/orders/OrderSummaryLines';
import type { OrderSummaryLinesProps } from '@/components/orders/OrderSummaryLines';

/**
 * Ödeme özeti (web `OrderSummaryLines`'ın checkout kullanımı). Satırlar sepetle ORTAK bileşendedir
 * (`OrderSummaryLines`: sıra, etiketler ve "tutarlar yalnız `pricing.summary`'den" sözleşmesi orada).
 * Burada yalnız quote hata kapısı var: hata verdiyse tutar basma — çıkış yolu ("Tekrar Dene") ver
 * (paylaşılan ErrorState, src/ui/CLAUDE.md › Empty and error states). Kupon indirimi özet satırı DEĞİL, kupon rozetinde bilgilendirmedir.
 */
export function OrderSummary({
  isError = false,
  onRetry,
  ...lines
}: OrderSummaryLinesProps & {
  isError?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  if (isError) {
    return (
      <View testID="order-summary-error">
        <ErrorState placement="inline"
          title={t('cart.priceUnavailableTitle')}
          message={t('checkout.priceUnavailableRetryBody')}
          onRetry={onRetry}
        />
      </View>
    );
  }
  return <OrderSummaryLines {...lines} testID="order-summary" />;
}
