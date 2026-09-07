import { View, ScrollView } from 'react-native';
import { Button, ScreenHeader } from '@/ui';
import { router, Redirect } from 'expo-router';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { useMembershipCheckout } from './_hooks/useMembershipCheckout';
import { styles } from './_lib/styles';
import { formatTL } from './_lib/tiers';
import {
  PlanCard,
  PaymentMethodCard,
  OrderSummary,
  CheckoutTerms,
} from './_components/CheckoutSections';

export default function MembershipCheckoutScreen() {
  const f = useMembershipCheckout();

  // Emniyet kilidi: iOS'ta uygulama içi dijital satış yok (Guideline 3.1.1).
  // Bir upsell çağrısı gözden kaçarsa bile ödeme akışı açılmasın.
  if (!CAN_BUY_DIGITAL) return <Redirect href="/membership" />;

  if (!f.isAuthenticated) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={f.t('membership.checkoutTitle')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PlanCard f={f} />
        <PaymentMethodCard />
        <OrderSummary f={f} />
        <CheckoutTerms />

        <Button
          variant="primary"
          title={f.loading ? f.t('checkout.processing') : f.t('membership.checkoutPayButton', { price: `₺${formatTL(f.displayPrice)}` })}
          onPress={f.handlePayment}
          isLoading={f.loading}
          disabled={f.loading}
          fullWidth
          style={styles.payButton}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
