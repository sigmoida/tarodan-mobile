import { Button } from '@/ui';
import { router, Redirect } from 'expo-router';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { formatPrice } from '@/utils/format';
import { PageShell } from '@/components/common/PageShell';
import { useMembershipCheckout } from './_hooks/useMembershipCheckout';
import {
  PlanCard,
  PaymentMethodCard,
  OrderSummary,
  CheckoutTerms,
} from './_components/CheckoutSections';

/** Üyelik ödemesi — PageShell + SectionCard dizisi; "Öde" sabit alt barda. (Yalnız görünüm: dijital satış kapısı değişmedi.) */
export default function MembershipCheckoutScreen() {
  const f = useMembershipCheckout();

  // Emniyet kilidi: iOS'ta uygulama içi dijital satış yok (Guideline 3.1.1).
  // Bir upsell çağrısı gözden kaçarsa bile ödeme akışı açılmasın.
  if (!CAN_BUY_DIGITAL) return <Redirect href="/membership" />;

  if (!f.isAuthenticated) return null;

  return (
    <PageShell
      title={f.t('membership.checkoutTitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      footer={
        <Button
          variant="primary"
          size="lg"
          title={f.t('membership.checkoutPayButton', { price: formatPrice(f.displayPrice) })}
          onPress={f.handlePayment}
          isLoading={f.loading}
          disabled={f.loading}
          fullWidth
        />
      }
    >
      <PlanCard f={f} />
      <PaymentMethodCard />
      <OrderSummary f={f} />
      <CheckoutTerms />
    </PageShell>
  );
}
