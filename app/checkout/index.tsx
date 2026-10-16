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
            email={c.guestEmail.trim().toLowerCase()}
            otpCode={c.otpCode}
            setOtpCode={c.setOtpCode}
            otpError={c.otpError}
            otpExpiresIn={c.otpExpiresIn}
            otpSending={c.otpSending}
            loading={c.loading}
            onSubmit={c.handleOtpSubmit}
            onResend={c.handleOtpResend}
          />
        </>
      }
    >
      <CheckoutItemsSection c={c} />
      <CheckoutUnavailableItems items={c.unavailableItems} titleFor={c.cartTitleFor} />
      <CheckoutAddressSection c={c} />
      <CheckoutSummarySection c={c} />
    </PageShell>
  );
}
