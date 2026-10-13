import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button, Chip, Divider, SectionCard, Text, theme, Icon, Alert } from '@/ui';
import UpgradeCta from '@/components/UpgradeCta';

import { PREMIUM_MEMBER_LIMITS } from '@/utils/membershipLimits';
import { formatBillingPeriod } from '../_lib/subscription';
import { styles } from '../_lib/styles';
import type { SubscriptionController } from '../_hooks/useSubscription';
import { formatPrice } from '@/utils/format';

/** Current plan, premium features, billing history, actions, warnings, help. */
export function SubscriptionBody({ f }: { f: SubscriptionController }) {
  const { t } = useTranslation();
  const { subscription, isPremium, isCancelled, daysLeft, statusInfo } = f;

  return (
    <>
      {/* Current Plan */}
      <SectionCard
        title={subscription?.tier?.name ?? (isPremium ? t('membership.premiumMembership') : t('membership.freeMembership'))}
        badge={
          isPremium && statusInfo ? (
            <Chip variant={f.statusChipVariant} size="sm" label={statusInfo.text} />
          ) : undefined
        }
        bodyStyle={styles.planBody}
      >
        {isPremium && subscription && (
          <>
            <View style={styles.detailRow}>
              <Text variant="bodySm" tone="muted">{t('membership.planLabel')}</Text>
              <Text variant="bodySm" weight="semibold">
                {formatBillingPeriod(t, subscription.billingPeriod)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant="bodySm" tone="muted">
                {isCancelled ? t('membership.endDateLabel') : t('membership.nextPaymentLabel')}
              </Text>
              <Text variant="bodySm" weight="semibold">
                {format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: tr })}
              </Text>
            </View>

            {daysLeft > 0 && (
              <View style={styles.detailRow}>
                <Text variant="bodySm" tone="muted">{t('membership.remainingLabel')}</Text>
                <Text variant="bodySm" weight="semibold" tone="primary">
                  {t('membership.daysCount', { count: daysLeft })}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Blok bütünüyle satışa yönelik (promo metni + "Premium'a Yükselt"
            düğmesi); iOS'ta yalnız düğmeyi gizlemek yetmez, blok tamamen kapanır. */}
        <UpgradeCta>
          {!isPremium && (
            <>
              <Text variant="bodySm" tone="muted">
                {t('membership.freePlanPromo')}
              </Text>
              <Button
                variant="primary"
                title={t('membership.upgradeToPremium')}
                onPress={() => router.push('/upgrade')}
              />
            </>
          )}
        </UpgradeCta>
      </SectionCard>

      {/* Premium Features */}
      {isPremium && (
        <SectionCard title={t('membership.yourPremiumFeatures')} bodyStyle={styles.features}>
          {[
            t('membership.featureUnlimitedListings'),
            t('membership.photoCountFeature', { count: PREMIUM_MEMBER_LIMITS.maxImagesPerListing }),
            t('membership.featureTrade'),
            t('membership.featureDigitalGarage'),
            t('membership.featureBoost'),
            t('membership.featureAnalytics'),
          ].map((text, index) => (
            <Text key={index} variant="bodySm">
              {text}
            </Text>
          ))}
        </SectionCard>
      )}

      {/* Billing History */}
      {f.billingHistory.length > 0 && (
        <SectionCard title={t('membership.invoiceHistory')}>
          {f.billingHistory.map((payment) => (
            <Pressable
              key={payment.id}
              style={styles.billingItem}
              disabled={!payment.invoiceUrl}
              accessibilityRole="link"
              android_ripple={{ color: theme.colors.overlay.black10 }}
              onPress={() => payment.invoiceUrl && Linking.openURL(payment.invoiceUrl)}
            >
              <View style={styles.billingInfo}>
                <Text variant="bodySm">
                  {format(new Date(payment.periodStart), 'MMM yyyy', { locale: tr })} -
                  {format(new Date(payment.periodEnd), 'MMM yyyy', { locale: tr })}
                </Text>
                <Text variant="caption">
                  {format(new Date(payment.createdAt), 'dd MMM yyyy', { locale: tr })}
                </Text>
              </View>
              <View style={styles.billingAmount}>
                <Text variant="label">{formatPrice(payment.amount)}</Text>
                <Chip
                  variant={payment.status === 'paid' ? 'success' : 'danger'}
                  size="sm"
                  label={payment.status === 'paid' ? t('order.statusPaid') : t('payment.statusPending')}
                />
              </View>
              {payment.invoiceUrl && (
                <Icon name="arrow-down-tray" size={theme.iconSize.md} color={theme.colors.primary[600]!} />
              )}
            </Pressable>
          ))}
        </SectionCard>
      )}

      {/* Subscription Actions */}
      {isPremium && subscription && (
        <SectionCard title={t('membership.subscriptionActions')} bodyStyle={styles.actions}>
          {/* Plan/dönem değişikliği yeni bir satın alma sayılır — iOS'ta gizli. */}
          <UpgradeCta>
            <View style={styles.actionBlock}>
              <Text variant="bodySm" tone="muted">
                {subscription.billingPeriod === 'monthly' ? t('membership.switchToYearly') : t('membership.switchToMonthly')}
              </Text>
              <Button
                variant="outline"
                fullWidth
                title={t('membership.changePlan')}
                onPress={() => router.push('/upgrade')}
              />
            </View>

            <Divider />
          </UpgradeCta>

          {!isCancelled ? (
            <View style={styles.actionBlock}>
              <Text variant="bodySm" tone="muted">
                {t('membership.cancelSubscriptionDesc')}
              </Text>
              <Button
                variant="danger"
                fullWidth
                title={t('membership.cancelTitle')}
                onPress={f.handleCancel}
              />
            </View>
          ) : (
            // Otomatik yenilemeyi yeniden AÇMAK, PayTR'de yinelenen tahsilatı
            // yeniden başlatmak demek — yani uygulama içi satın alma. iOS'ta
            // gizli; İPTAL satırı (yukarıda) satın alma olmadığı için kalır.
            <UpgradeCta>
              <View style={styles.actionBlock}>
                <Text variant="bodySm" tone="muted">
                  {t('membership.reactivateSubscriptionDesc')}
                </Text>
                <Button
                  variant="success"
                  fullWidth
                  title={t('membership.reactivateSubscriptionTitle')}
                  onPress={f.handleReactivate}
                />
              </View>
            </UpgradeCta>
          )}
        </SectionCard>
      )}

      {/* Downgrade Warning */}
      {isCancelled && daysLeft > 0 && (
        <Alert variant="warning" title={t('membership.expiringWarningTitle', { count: daysLeft })}>
          {t('membership.expiringWarningDesc')}
        </Alert>
      )}

      {/* Help */}
      <Button
        variant="link"
        title={t('membership.subscriptionHelp')}
        onPress={() => router.push('/help')}
      />
    </>
  );
}
