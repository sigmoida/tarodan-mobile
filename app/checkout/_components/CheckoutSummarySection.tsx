import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SectionCard } from '@/ui';
import { DistanceSalesConsent } from '@/components/payment/DistanceSalesConsent';
import { OrderSummary } from './OrderSummary';
import { CouponInput } from './CouponInput';
import { styles } from '../_lib/styles';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;
type Props = Pick<
  Ctrl,
  | 'coupon'
  | 'couponDiscount'
  | 'productAmount'
  | 'shippingCost'
  | 'serviceFeeAmount'
  | 'total'
  | 'quantityDiscount'
  | 'feeDiscounts'
  | 'feeDiscountTotal'
  | 'quoteError'
  | 'quoteLoading'
  | 'retryQuote'
  | 'distanceSalesAccepted'
  | 'toggleDistanceSales'
>;

/**
 * Sipariş özeti kartı (web `OrderSummarySidebar`): kupon, tutar satırları ve — tutarın hemen
 * altında — mesafeli satış sözleşmesi onayı. Onay ödemeyi kapatıyor (yasal yükümlülük) ve
 * sunucuya İLK çağrıda gidiyor (idempotency replay sonradan geleni işlemez). "Ödeme Yap"
 * düğmesi sabit alt barda (`CheckoutPayBar`).
 *
 * `React.memo` + dar prop'lar: adres/iletişim alanlarına yazarken bu kart yeniden çizilmez.
 */
export const CheckoutSummarySection = React.memo(function CheckoutSummarySection(c: Props) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.orderSummary')} testID="checkout-summary">
      <View style={styles.couponSpacer}>
        <CouponInput coupon={c.coupon} couponDiscount={c.couponDiscount} />
      </View>

      <OrderSummary
        productAmount={c.productAmount}
        shippingAmount={c.shippingCost}
        serviceFeeAmount={c.serviceFeeAmount}
        total={c.total}
        quantityDiscount={c.quantityDiscount}
        feeDiscounts={c.feeDiscounts}
        feeDiscountTotal={c.feeDiscountTotal}
        // Tutar YOK ama hata da yok (200 döndü, `total` alanı boş): buton zaten kapalı, ama çıkış
        // yolu olmadan kullanıcı "—" satırlarıyla kilitli kalır. `quoteLoading` kapısı ilk
        // yüklemede hata kartının yanıp sönmesini önler.
        isError={c.quoteError || (!c.quoteLoading && c.total == null)}
        onRetry={c.retryQuote}
      />

      <View style={styles.consent}>
        <DistanceSalesConsent
          testID="checkout-distance-sales-checkbox"
          checked={c.distanceSalesAccepted}
          onToggle={c.toggleDistanceSales}
        />
      </View>
    </SectionCard>
  );
});
