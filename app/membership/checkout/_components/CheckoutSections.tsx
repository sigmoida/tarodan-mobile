import { View } from 'react-native';
import { Card, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import { formatTL } from '../_lib/tiers';
import type { MembershipCheckoutController } from '../_hooks/useMembershipCheckout';

const { colors } = theme;

/** Seçili plan kartı — ad, fiyat, popüler rozeti, ilk 3 özellik. */
export function PlanCard({ f }: { f: MembershipCheckoutController }) {
  const { t, tier, displayPrice, periodLabel } = f;
  return (
    <Card style={[styles.planCard, { borderColor: tier.color }]}>
      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, { color: tier.color }]}>{tier.name}</Text>
          <Text style={styles.planPrice}>
            ₺{formatTL(displayPrice)}<Text style={styles.planPeriod}>{periodLabel}</Text>
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
    </Card>
  );
}

/** PayTR güvenli ödeme bilgi kartı. */
export function PaymentMethodCard() {
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
      <Card style={styles.paymentCard}>
        <View style={styles.paymentOption}>
          <Ionicons name="lock-closed" size={20} color={colors.success[600]!} />
          <Text style={styles.paymentOptionText}>
            {t('membership.checkoutPaymentInfo')}
          </Text>
        </View>
      </Card>
    </>
  );
}

/** Sipariş özeti (KDV dahil tek satır + toplam). */
export function OrderSummary({ f }: { f: MembershipCheckoutController }) {
  const { t, tier, displayPrice, billingPeriod } = f;
  return (
    <>
      <Text style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t('membership.checkoutSummaryLine', {
              tierName: tier.name,
              period: billingPeriod === 'yearly' ? t('membership.yearly') : t('membership.monthly'),
            })}
          </Text>
          <Text style={styles.summaryValue}>₺{formatTL(displayPrice)}</Text>
        </View>
        <Text style={styles.vatNote}>{t('membership.checkoutVatNote')}</Text>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>{t('common.total')}</Text>
          <Text style={styles.totalValue}>₺{formatTL(displayPrice)}</Text>
        </View>
      </Card>
    </>
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
