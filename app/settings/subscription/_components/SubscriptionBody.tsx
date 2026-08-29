import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, Button, Chip, Divider, Text, theme } from '@/ui';

import { PREMIUM_MEMBER_LIMITS } from '@/utils/membershipLimits';
import { formatBillingPeriod } from '../_lib/subscription';
import { styles } from '../_lib/styles';
import type { SubscriptionController } from '../_hooks/useSubscription';

const { colors } = theme;

/** Current plan, premium features, billing history, actions, warnings, help. */
export function SubscriptionBody({ f }: { f: SubscriptionController }) {
  const { t } = useTranslation();
  const { subscription, isPremium, isCancelled, daysLeft, statusInfo } = f;

  return (
    <ScrollView style={styles.content}>
      {/* Current Plan */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text variant="h2" style={styles.planName}>
              {subscription?.tier?.name ?? (isPremium ? t('membership.premiumMembership') : t('membership.freeMembership'))}
            </Text>
            {isPremium && statusInfo && (
              <Chip variant={f.statusChipVariant} size="sm" style={styles.statusChip} label={statusInfo.text} />
            )}
          </View>
          {isPremium && (
            <MaterialCommunityIcons name="crown" size={40} color={colors.primary[600]!} />
          )}
        </View>

        {isPremium && subscription && (
          <>
            <Divider style={styles.divider} />

            <View style={styles.planDetails}>
              <View style={styles.detailRow}>
                <Text variant="body" style={styles.detailLabel}>{t('membership.planLabel')}</Text>
                <Text variant="body" style={styles.detailValue}>
                  {formatBillingPeriod(t, subscription.billingPeriod)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text variant="body" style={styles.detailLabel}>
                  {isCancelled ? t('membership.endDateLabel') : t('membership.nextPaymentLabel')}
                </Text>
                <Text variant="body" style={styles.detailValue}>
                  {format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: tr })}
                </Text>
              </View>

              {daysLeft > 0 && (
                <View style={styles.detailRow}>
                  <Text variant="body" style={styles.detailLabel}>{t('membership.remainingLabel')}</Text>
                  <Text variant="body" style={[styles.detailValue, { color: colors.primary[600]! }]}>
                    {t('membership.daysCount', { count: daysLeft })}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {!isPremium && (
          <>
            <Divider style={styles.divider} />
            <Text variant="body" style={styles.upgradePrompt}>
              {t('membership.freePlanPromo')}
            </Text>
            <Button
              variant="primary"
              title={t('membership.upgradeToPremium')}
              icon="diamond"
              onPress={() => router.push('/upgrade')}
              style={styles.upgradeButton}
            />
          </>
        )}
      </Card>

      {/* Premium Features */}
      {isPremium && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>{t('membership.yourPremiumFeatures')}</Text>

          <View style={styles.featuresGrid}>
            {[
              { icon: 'pricetag', text: t('membership.featureUnlimitedListings') },
              { icon: 'camera', text: t('membership.photoCountFeature', { count: PREMIUM_MEMBER_LIMITS.maxImagesPerListing }) },
              { icon: 'swap-horizontal', text: t('membership.featureTrade') },
              { icon: 'images', text: t('membership.featureDigitalGarage') },
              { icon: 'star', text: t('membership.featureBoost') },
              { icon: 'analytics', text: t('membership.featureAnalytics') },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={20} color={colors.primary[600]!} />
                </View>
                <Text variant="bodySm" style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Billing History */}
      {f.billingHistory.length > 0 && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>{t('membership.invoiceHistory')}</Text>

          {f.billingHistory.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              style={styles.billingItem}
              onPress={() => payment.invoiceUrl && Linking.openURL(payment.invoiceUrl)}
            >
              <View style={styles.billingInfo}>
                <Text variant="body">
                  {format(new Date(payment.periodStart), 'MMM yyyy', { locale: tr })} -
                  {format(new Date(payment.periodEnd), 'MMM yyyy', { locale: tr })}
                </Text>
                <Text variant="bodySm" style={styles.billingDate}>
                  {format(new Date(payment.createdAt), 'dd MMM yyyy', { locale: tr })}
                </Text>
              </View>
              <View style={styles.billingAmount}>
                <Text variant="body" style={styles.amount}>
                  ₺{(payment.amount ?? 0).toLocaleString('tr-TR')}
                </Text>
                <Chip
                  variant={payment.status === 'paid' ? 'success' : 'danger'}
                  size="sm"
                  style={styles.paymentStatusChip}
                  label={payment.status === 'paid' ? t('order.statusPaid') : t('payment.statusPending')}
                />
              </View>
              {payment.invoiceUrl && (
                <Ionicons name="download-outline" size={20} color={colors.primary[600]!} />
              )}
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Subscription Actions */}
      {isPremium && subscription && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>{t('membership.subscriptionActions')}</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/upgrade')}>
            <Ionicons name="swap-vertical" size={24} color={colors.text.muted} />
            <View style={styles.actionTextWrap}>
              <Text variant="body" style={styles.actionTitle}>{t('membership.changePlan')}</Text>
              <Text variant="bodySm" style={styles.actionDesc}>
                {subscription.billingPeriod === 'monthly' ? t('membership.switchToYearly') : t('membership.switchToMonthly')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.subtle} />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          {!isCancelled ? (
            <TouchableOpacity style={styles.actionRow} onPress={f.handleCancel}>
              <Ionicons name="close-circle-outline" size={24} color={colors.danger[600]!} />
              <View style={styles.actionTextWrap}>
                <Text variant="body" style={[styles.actionTitle, { color: colors.danger[600]! }]}>
                  {t('membership.cancelTitle')}
                </Text>
                <Text variant="bodySm" style={styles.actionDesc}>
                  {t('membership.cancelSubscriptionDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionRow} onPress={f.handleReactivate}>
              <Ionicons name="refresh" size={24} color={colors.success[600]!} />
              <View style={styles.actionTextWrap}>
                <Text variant="body" style={[styles.actionTitle, { color: colors.success[600]! }]}>
                  {t('membership.reactivateSubscriptionTitle')}
                </Text>
                <Text variant="bodySm" style={styles.actionDesc}>
                  {t('membership.reactivateSubscriptionDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Downgrade Warning */}
      {isCancelled && daysLeft > 0 && (
        <Card style={styles.warningCard}>
          <View style={styles.warningContent}>
            <Ionicons name="warning" size={24} color={colors.warning[600]!} />
            <View style={styles.warningText}>
              <Text variant="body" style={styles.warningTitle}>
                {t('membership.expiringWarningTitle', { count: daysLeft })}
              </Text>
              <Text variant="bodySm" style={styles.warningDesc}>
                {t('membership.expiringWarningDesc')}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Help */}
      <TouchableOpacity style={styles.helpLink} onPress={() => router.push('/help')}>
        <Ionicons name="help-circle" size={20} color={colors.primary[600]!} />
        <Text style={styles.helpText}>{t('membership.subscriptionHelp')}</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
