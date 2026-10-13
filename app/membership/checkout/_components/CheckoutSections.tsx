import { View } from 'react-native';
import { SectionCard, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '@/utils/format';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { MembershipCheckoutController } from '../_hooks/useMembershipCheckout';

const { colors } = theme;

/** Seçili plan kartı — ad, fiyat, popüler rozeti, ilk 3 özellik. */
export function PlanCard({ f }: { f: MembershipCheckoutController }) {
  const { t, tier, displayPrice, periodLabel } = f;
  return (
    <SectionCard style={{ borderColor: tier.color }} bodyStyle={styles.planBody}>
      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, { color: tier.color }]}>{tier.name}</Text>
          <Text style={styles.planPrice}>
            {formatPrice(displayPrice)}<Text style={styles.planPeriod}>{periodLabel}</Text>
          </Text>
        </View>
        {'popular' in tier && tier.popular && (
          <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.popularBadgeText}>{t('common.popular')}</Text>
          </View>
        )}
      </View>
      <View style={styles.featuresCompact}>
        {tier.features.slice(0, 3).map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={tier.color} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
        {tier.features.length > 3 && (
          <Text style={styles.moreFeatures}>{t('membership.checkoutMoreFeatures', { count: tier.features.length - 3 })}</Text>
        )}
      </View>
    </SectionCard>
  );
}

/** PayTR güvenli ödeme bilgi kartı. */
export function PaymentMethodCard() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.paymentMethod')}>
      <Text variant="bodySm" tone="muted">{t('membership.checkoutPaymentInfo')}</Text>
    </SectionCard>
  );
}

/** Sipariş özeti (KDV dahil tek satır + toplam). */
export function OrderSummary({ f }: { f: MembershipCheckoutController }) {
  const { t, tier, displayPrice, billingPeriod } = f;
  return (
    <SectionCard title={t('checkout.orderSummary')} bodyStyle={styles.planBody}>
      <View style={styles.summaryRow}>
        <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
          {t('membership.checkoutSummaryLine', {
            tierName: tier.name,
            period: billingPeriod === 'yearly' ? t('membership.yearly') : t('membership.monthly'),
          })}
        </Text>
        <Text variant="bodySm" weight="medium">{formatPrice(displayPrice)}</Text>
      </View>
      <Text variant="caption" tone="muted">{t('membership.checkoutVatNote')}</Text>
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <Text variant="h3" tone="heading">{t('common.total')}</Text>
        <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>{formatPrice(displayPrice)}</Text>
      </View>
    </SectionCard>
  );
}

/** Kullanım koşulları / gizlilik onay metni. */
export function CheckoutTerms() {
  const { t } = useTranslation();
  return (
    <Text style={styles.terms}>
      {t('membership.checkoutTermsPrefix')}{' '}
      <Text style={styles.termsLink} onPress={() => router.push('/terms')}>{t('footer.terms')}</Text>
      <Text>{t('membership.checkoutTermsAnd')}</Text>
      <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>{t('footer.privacy')}</Text>
      {t('membership.checkoutTermsSuffix')}
    </Text>
  );
}
