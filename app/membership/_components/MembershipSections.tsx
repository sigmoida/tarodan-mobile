import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui';

import { styles } from '../_lib/membershipStyles';
import {
  TIER_COLORS,
  TIER_ICONS,
  buildTierNames,
  formatTL,
  type TierType,
} from '../_lib/membershipTiers';
import type { MembershipController } from '../_hooks/useMembership';

const { colors } = theme;

type SectionProps = { f: MembershipController };

// ---------------------------------------------------------------------------
// Error + pending-payment banners
// ---------------------------------------------------------------------------
export function MembershipBanners({ f }: SectionProps) {
  const { membership, t } = f;
  return (
    <>
      {f.error ? (
        <TouchableOpacity style={styles.errorBanner} onPress={f.fetchData} activeOpacity={0.8}>
          <Ionicons name="alert-circle" size={18} color={colors.danger[600]!} />
          <Text style={styles.errorBannerText}>{f.error}</Text>
          <Text style={styles.errorBannerRetry}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      ) : null}

      {f.hasPendingPayment && (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() =>
            router.push(
              `/membership/checkout?tier=${membership?.pendingPayment?.tierType || membership?.pendingTierType || 'premium'}&period=monthly`
            )
          }
        >
          <Ionicons name="warning" size={22} color={colors.warning[800]!} />
          <View style={styles.pendingBannerText}>
            <Text style={styles.pendingTitle}>
              {t('membership.pendingPaymentTitle', {
                tierName: membership?.pendingPayment?.tierName || membership?.pendingTierName || t('membership.planFallback'),
              })}
            </Text>
            <Text style={styles.pendingSubtitle}>{t('membership.pendingPaymentSubtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.warning[800]!} />
        </TouchableOpacity>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Current plan summary card
// ---------------------------------------------------------------------------
export function MembershipCurrentPlan({ f }: SectionProps) {
  const { currentTier, membership, t } = f;
  const tierNames = buildTierNames(t);
  return (
    <View style={styles.currentPlanCard}>
      <View style={[styles.currentPlanIcon, { backgroundColor: TIER_COLORS[currentTier] + '20' }]}>
        <Ionicons name={TIER_ICONS[currentTier]} size={28} color={TIER_COLORS[currentTier]} />
      </View>
      <Text style={styles.currentPlanLabel}>{t('membership.currentPlan')}</Text>
      <Text style={[styles.currentPlanName, { color: TIER_COLORS[currentTier] }]}>
        {tierNames[currentTier]}
      </Text>
      {membership?.currentPeriodEnd && currentTier !== 'free' && (
        <Text style={styles.currentPlanExpiry}>
          {t('membership.renewalLabel', {
            date: new Date(membership.currentPeriodEnd).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })}
        </Text>
      )}
      {/* Üyelik yönetimi: otomatik yenileme + kayıtlı kartlar (tüm kademeler) */}
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => router.push('/membership/manage' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="settings-outline" size={16} color={colors.primary[600]!} />
        <Text style={styles.manageButtonText}>
          {t('membership.manageMembershipHint')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary[600]!} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Billing period toggle (monthly / yearly)
// ---------------------------------------------------------------------------
export function MembershipBillingToggle({ f }: SectionProps) {
  const { t } = f;
  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, f.billingPeriod === 'monthly' && styles.toggleButtonActive]}
        onPress={() => f.setBillingPeriod('monthly')}
      >
        <Text style={[styles.toggleText, f.billingPeriod === 'monthly' && styles.toggleTextActive]}>{t('membership.monthly')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, f.billingPeriod === 'yearly' && styles.toggleButtonActive]}
        onPress={() => f.setBillingPeriod('yearly')}
      >
        <Text style={[styles.toggleText, f.billingPeriod === 'yearly' && styles.toggleTextActive]}>{t('membership.yearly')}</Text>
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{t('membership.discountBadge', { percent: f.settings.yearly_discount_percentage ?? 20 })}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Horizontal tier cards
// ---------------------------------------------------------------------------
function TierCard({ f, tier }: { f: MembershipController; tier: TierType }) {
  const { t } = f;
  const tierNames = buildTierNames(t);
  const price = f.getPrice(tier);
  const isCurrent = tier === f.currentTier;
  const isUpgrade = f.tierIndex(tier) > f.tierIndex(f.currentTier);
  const color = TIER_COLORS[tier];
  const features = f.getFeatures(tier);

  return (
    <View style={[styles.tierCard, isCurrent && { borderColor: color, borderWidth: 2 }]}>
      {/* Popular badge for premium */}
      {tier === 'premium' && (
        <View style={[styles.popularBadge, { backgroundColor: color }]}>
          <Text style={styles.popularBadgeText}>{t('membership.mostPopular')}</Text>
        </View>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <View style={[styles.currentBadge, { backgroundColor: color }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.white} />
          <Text style={styles.currentBadgeText}>{t('membership.currentPlanBadge')}</Text>
        </View>
      )}

      <View style={[styles.tierIconCircle, { backgroundColor: color + '15' }]}>
        <Ionicons name={TIER_ICONS[tier]} size={24} color={color} />
      </View>

      <Text style={[styles.tierName, { color }]}>{tierNames[tier]}</Text>

      <View style={styles.tierPriceRow}>
        {price === 0 ? (
          <Text style={styles.tierPriceFree}>{t('membership.free')}</Text>
        ) : (
          <>
            <Text style={styles.tierPrice}>{formatTL(price)} ₺</Text>
            <Text style={styles.tierPricePeriod}>{f.billingPeriod === 'monthly' ? t('membership.perMonth') : t('membership.perYear')}</Text>
          </>
        )}
      </View>

      {f.billingPeriod === 'yearly' && price > 0 && (
        <Text style={styles.tierMonthlyEquiv}>
          {t('membership.monthlyEquivLabel', { amount: Math.round(price / 12).toLocaleString('tr-TR') })}
        </Text>
      )}

      <View style={styles.tierDivider} />

      <View style={styles.tierFeatures}>
        {features.map((feat, idx) => (
          <View key={idx} style={styles.tierFeatureRow}>
            <Ionicons name="checkmark-circle" size={16} color={color} />
            <Text style={styles.tierFeatureText}>{feat}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[
          styles.tierButton,
          isCurrent
            ? { backgroundColor: color + '15', borderColor: color, borderWidth: 1 }
            : isUpgrade
              ? { backgroundColor: color }
              : { backgroundColor: colors.gray[100]! },
        ]}
        onPress={() => f.handleTierAction(tier)}
        disabled={isCurrent || tier === 'free'}
      >
        <Text
          style={[
            styles.tierButtonText,
            isCurrent
              ? { color }
              : isUpgrade
                ? { color: colors.white }
                : { color: colors.text.subtle },
          ]}
        >
          {isCurrent
            ? t('membership.currentPlanBadge')
            : tier === 'free'
              ? t('membership.free')
              : isUpgrade
                ? t('membership.upgrade')
                : t('membership.lowerPlanButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function MembershipTierList({ f }: SectionProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tierCardsContainer}
      decelerationRate="fast"
      snapToInterval={280 + 12}
      snapToAlignment="start"
    >
      {f.visibleTiers.map((tier) => (
        <TierCard key={tier} f={f} tier={tier} />
      ))}
    </ScrollView>
  );
}
