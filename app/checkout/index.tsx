import { useTranslation } from 'react-i18next';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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

        <CheckoutUnavailableItems items={c.unavailableItems} titleFor={c.cartTitleFor} />

        <OrderSummary
          // Ayrılan satırlar sunucu toplamına girmedi — sayaç da onları saymaz.
          itemCount={c.payableItems.length}
          productAmount={c.productAmount}
          shippingCost={c.shippingCost}
          serviceFeeAmount={c.serviceFeeAmount}
          total={c.total}
          quantityDiscount={c.quantityDiscount}
          feeDiscounts={c.feeDiscounts}
          feeDiscountTotal={c.feeDiscountTotal}
          // Tutar YOK ama hata da yok (200 döndü, `total` alanı boş): buton zaten
          // kapalı, ama çıkış yolu olmadan kullanıcı dört "—" ile kilitli kalır.
          // `quoteLoading` kapısı ilk yüklemede hata kartının yanıp sönmesini önler.
          isError={c.quoteError || (!c.quoteLoading && c.total == null)}
          onRetry={c.retryQuote}
        />

        {/* Mesafeli satış sözleşmesi onayı — YALNIZ onay adımında ve ödemeyi
            kapatıyor. Yasal yükümlülük; onay sunucuya İLK çağrıda gidiyor
            (idempotency replay sonradan geleni işlemez). */}
        {c.step === 3 ? (
          <View style={styles.consentRow}>
            <TouchableOpacity
              testID="checkout-distance-sales-checkbox"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: c.distanceSalesAccepted }}
              onPress={c.toggleDistanceSales}
              hitSlop={8}
            >
              <Ionicons
                name={c.distanceSalesAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color={c.distanceSalesAccepted ? theme.colors.primary[600]! : theme.colors.text.muted}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text variant="caption">{t('checkout.distanceSalesConsent')}</Text>
              <TouchableOpacity onPress={() => router.push('/distance-sales')}>
                <Text variant="caption" style={styles.consentLink}>
                  {t('checkout.distanceSalesConsentLink')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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
            testID="checkout-pay-button"
            onPress={c.handleCheckout}
            isLoading={c.loading}
            disabled={
              c.loading || c.quoteLoading || c.quoteError || c.total == null || !c.distanceSalesAccepted
            }
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
