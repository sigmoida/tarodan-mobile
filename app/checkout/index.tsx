import { useTranslation } from 'react-i18next';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Snackbar, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/common';
import { formatPrice } from '@/utils/format';
import { styles } from './_lib/styles';
import { useCheckout } from './_hooks/useCheckout';
import { CheckoutProgress } from './_components/CheckoutProgress';
import { Step1Address, Step2Payment, Step3Confirm } from './_components/CheckoutSteps';
import { OrderSummary } from './_components/OrderSummary';
import { CheckoutUnavailableItems } from './_components/CheckoutUnavailableItems';
import { CouponInput } from './_components/CouponInput';
import { OtpModal } from './_modals/OtpModal';

const { colors } = theme;

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const c = useCheckout();

  if (c.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color={colors.text.muted} />
        <Text style={styles.emptyTitle}>{t('checkout.emptyCart')}</Text>
        <Text style={styles.emptySubtitle}>{t('checkout.emptyCartDesc')}</Text>
        <Button
          variant="primary"
          title="Alışverişe Başla"
          onPress={() => router.replace('/' as any)}
          style={{ marginTop: theme.spacing[5], alignSelf: 'center' }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={c.step === 1 ? t('checkout.shippingInfo') : c.step === 2 ? t('checkout.title') : t('checkout.orderConfirmation')}
        onBack={() => (c.step > 1 ? c.setStep(c.step - 1) : router.back())}
      />

      <CheckoutProgress step={c.step} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {c.step === 1 ? <Step1Address c={c} /> : null}
        {c.step === 2 ? <Step2Payment c={c} /> : null}
        {c.step === 3 ? <Step3Confirm c={c} /> : null}

        <CouponInput coupon={c.coupon} couponDiscount={c.couponDiscount} />

        <CheckoutUnavailableItems items={c.unavailableItems} />

        <OrderSummary
          itemCount={c.items.length}
          productAmount={c.productAmount}
          shippingCost={c.shippingCost}
          serviceFeeAmount={c.serviceFeeAmount}
          total={c.total}
          // Tutar YOK ama hata da yok (200 döndü, `total` alanı boş): buton zaten
          // kapalı, ama çıkış yolu olmadan kullanıcı dört "—" ile kilitli kalır.
          // `quoteLoading` kapısı ilk yüklemede hata kartının yanıp sönmesini önler.
          isError={c.quoteError || (!c.quoteLoading && c.total == null)}
          onRetry={c.retryQuote}
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {c.step < 3 ? (
          <Button
            variant="primary"
            title="Devam Et"
            onPress={c.handleNextStep}
            icon="arrow-forward"
            iconPosition="right"
            style={{ ...styles.actionButton, ...styles.continueButton }}
          />
        ) : (
          <Button
            variant="primary"
            // Toplam bilinmiyorken butona TUTAR BASILMAZ — "Onayla ve Öde (0,00 TL)"
            // yazan etkin bir buton, quote hata verdiğinde kullanıcıyı boş bir
            // guard mesajına sürüklüyordu. Bilinmiyorsa buton da devre dışı.
            title={
              c.loading
                ? t('checkout.processing')
                : c.total == null
                  ? t('checkout.confirmAndPay')
                  : `Onayla ve Öde (${formatPrice(c.total)})`
            }
            onPress={c.handleCheckout}
            isLoading={c.loading}
            disabled={c.loading || c.quoteLoading || c.quoteError || c.total == null}
            fullWidth
            style={styles.actionButton}
            icon="card-outline"
          />
        )}
      </View>

      <Snackbar visible={c.snackbar.visible} onDismiss={c.dismissSnackbar} duration={3000} variant="danger">
        {c.snackbar.message}
      </Snackbar>

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
    </KeyboardAvoidingView>
  );
}
