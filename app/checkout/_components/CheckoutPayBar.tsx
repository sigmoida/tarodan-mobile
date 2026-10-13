import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;

/**
 * Sabit alt bar: "Ödeme Yap" (web `PayAction`). Düğme etiketi hep aynı kalır (yükleniyor = spinner,
 * web Button gibi) ve düğmeye TUTAR BASILMAZ — toplam bilinmiyorken "Öde (0,00 TL)" yazan etkin bir
 * buton kullanıcıyı boş bir guard mesajına sürüklüyordu. Tutar bilinmiyorsa / quote hatalıysa /
 * sözleşme onaylanmadıysa buton devre dışıdır; sebep onay eksikse tek satır ipucu verilir.
 */
export function CheckoutPayBar({ c }: { c: Ctrl }) {
  const { t } = useTranslation();
  return (
    <>
      {!c.distanceSalesAccepted ? (
        <Text variant="caption" tone="muted" align="center">
          {t('checkout.distanceSalesRequired')}
        </Text>
      ) : null}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t('checkout.payNow')}
        testID="checkout-pay-button"
        onPress={c.handleCheckout}
        isLoading={c.loading}
        disabled={c.loading || c.quoteLoading || c.quoteError || c.total == null || !c.distanceSalesAccepted}
      />
    </>
  );
}
