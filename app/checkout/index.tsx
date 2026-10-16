import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { useCheckout } from './_hooks/useCheckout';
import { CheckoutItemsSection } from './_components/CheckoutItemsSection';
import { CheckoutUnavailableItems } from './_components/CheckoutUnavailableItems';
import { CheckoutAddressSection } from './_components/CheckoutAddressSection';
import { CheckoutSummarySection } from './_components/CheckoutSummarySection';
import { CheckoutPayBar } from './_components/CheckoutPayBar';
import { OtpModal } from './_modals/OtpModal';

/**
 * Ödeme — web gibi TEK sayfa (web `CheckoutClient`): ürünler, teslimat/fatura adresi, ödeme yöntemi
 * ve sipariş özeti alt alta; "Ödeme Yap" sabit alt barda. Web stepper'ı bilinçli kaldırmış; mobil de
 * artık adım adım ilerlemez. Mantığın tamamı `useCheckout`'ta (ödeme-kritik controller, değişmedi);
 * burası yalnız sunum.
 *
 * Bölümler `React.memo` ve dar prop alır (controller'da referans-kararlı): adres alanına yazarken
 * ürün/özet kartları yeniden çizilmez. Misafir alanları (RHF), OTP kodu ve geri sayımı kendi
 * bileşenlerinde — tuş vuruşu / saniyelik tik checkout'u baştan çizmez.
 */
export default function CheckoutScreen() {
  const { t } = useTranslation();
  const c = useCheckout();

  if (c.items.length === 0) {
    return (
      <PageShell
        title={t('checkout.title')}
        empty
        emptyState={{
          icon: 'shopping-cart',
          title: t('checkout.emptyCart'),
          subtitle: t('checkout.emptyCartDesc'),
          actionLabel: t('checkout.startShopping'),
          onAction: () => router.replace('/' as any),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t('checkout.title')}
      footer={<CheckoutPayBar c={c} />}
      overlay={
        <>
          <OtpModal
            visible={c.otpModalOpen}
            onClose={c.closeOtpModal}
            email={c.otpEmail}
            codeResetSeq={c.otpCodeResetSeq}
            otpError={c.otpError}
            resendAt={c.otpResendAt}
            otpSending={c.otpSending}
            loading={c.loading}
            onSubmit={c.handleOtpSubmit}
            onResend={c.handleOtpResend}
          />
        </>
      }
    >
      <CheckoutItemsSection
        isBuyNow={c.isBuyNow}
        payableItems={c.payableItems}
        lineQuantityFor={c.lineQuantityFor}
        lineSubtotalFor={c.lineSubtotalFor}
      />
      <CheckoutUnavailableItems items={c.unavailableItems} titleFor={c.cartTitleFor} />
      <CheckoutAddressSection
        isAuthenticated={c.isAuthenticated}
        guestForm={c.guestForm}
        addresses={c.addresses}
        selectedAddressId={c.selectedAddressId}
        setSelectedAddressId={c.setSelectedAddressId}
        shippingAddressStore={c.shippingAddressStore}
        billingDifferent={c.billingDifferent}
        setBillingDifferent={c.setBillingDifferent}
        selectedBillingAddressId={c.selectedBillingAddressId}
        setSelectedBillingAddressId={c.setSelectedBillingAddressId}
        billingAddressStore={c.billingAddressStore}
      />
      <CheckoutSummarySection
        coupon={c.coupon}
        couponDiscount={c.couponDiscount}
        productAmount={c.productAmount}
        shippingCost={c.shippingCost}
        serviceFeeAmount={c.serviceFeeAmount}
        total={c.total}
        quantityDiscount={c.quantityDiscount}
        feeDiscounts={c.feeDiscounts}
        feeDiscountTotal={c.feeDiscountTotal}
        quoteError={c.quoteError}
        quoteLoading={c.quoteLoading}
        retryQuote={c.retryQuote}
        distanceSalesAccepted={c.distanceSalesAccepted}
        toggleDistanceSales={c.toggleDistanceSales}
      />
    </PageShell>
  );
}
