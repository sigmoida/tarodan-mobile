import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, RawText } from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

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
          <RawText style={styles.errorBannerText}>{f.error}</RawText>
          <RawText style={styles.errorBannerRetry}>{t('common.tryAgain')}</RawText>
        </TouchableOpacity>
      ) : null}

      {/* Bekleyen ödeme bandı yarım kalmış PayTR ödemesini tamamlamaya çağırıyor
          — iOS'ta satın alma çağrısı olduğu için kalkar. Hata bandı (yukarıda)
          satın almayla ilgisi olmadığı için DOKUNULMAZ. */}
      {f.hasPendingPayment && CAN_BUY_DIGITAL && (
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
            <RawText style={styles.pendingTitle}>
              {t('membership.pendingPaymentTitle', {
                tierName: membership?.pendingPayment?.tierName || membership?.pendingTierName || t('membership.planFallback'),
              })}
            </RawText>
            <RawText style={styles.pendingSubtitle}>{t('membership.pendingPaymentSubtitle')}</RawText>
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
      <RawText style={styles.currentPlanLabel}>{t('membership.currentPlan')}</RawText>
      <RawText style={[styles.currentPlanName, { color: TIER_COLORS[currentTier] }]}>
        {tierNames[currentTier]}
      </RawText>
      {membership?.currentPeriodEnd && currentTier !== 'free' && (
        <RawText style={styles.currentPlanExpiry}>
          {t('membership.renewalLabel', {
            date: new Date(membership.currentPeriodEnd).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })}
        </RawText>
      )}
      {/* Üyelik yönetimi: otomatik yenileme + kayıtlı kartlar (tüm kademeler).
          Bu satırın kendisi tam olarak PayTR'nin yinelenen tahsilat
          yönetimini tanıtıyor — iOS'ta hem FREE hem PAID kullanıcıdan
          gizlenir. İPTAL akışı buradan değil Profil → Abonelik
          (SubscriptionBody) üzerinden gelir ve orada iOS'ta da açıktır. */}
      {CAN_BUY_DIGITAL && (
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push('/membership/manage' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={16} color={colors.primary[600]!} />
          <RawText style={styles.manageButtonText}>
            {t('membership.manageMembershipHint')}
          </RawText>
          <Ionicons name="chevron-forward" size={16} color={colors.primary[600]!} />
        </TouchableOpacity>
      )}
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
        <RawText style={[styles.toggleText, f.billingPeriod === 'monthly' && styles.toggleTextActive]}>{t('membership.monthly')}</RawText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, f.billingPeriod === 'yearly' && styles.toggleButtonActive]}
        onPress={() => f.setBillingPeriod('yearly')}
      >
        <RawText style={[styles.toggleText, f.billingPeriod === 'yearly' && styles.toggleTextActive]}>{t('membership.yearly')}</RawText>
        <View style={styles.discountBadge}>
          <RawText style={styles.discountBadgeText}>{t('membership.discountBadge', { percent: f.settings.yearly_discount_percentage ?? 20 })}</RawText>
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
          <RawText style={styles.popularBadgeText}>{t('membership.mostPopular')}</RawText>
        </View>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <View style={[styles.currentBadge, { backgroundColor: color }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.white} />
          <RawText style={styles.currentBadgeText}>{t('membership.currentPlanBadge')}</RawText>
        </View>
      )}

      <View style={[styles.tierIconCircle, { backgroundColor: color + '15' }]}>
        <Ionicons name={TIER_ICONS[tier]} size={24} color={color} />
      </View>

      <RawText style={[styles.tierName, { color }]}>{tierNames[tier]}</RawText>

      <View style={styles.tierPriceRow}>
        {price === 0 ? (
          <RawText style={styles.tierPriceFree}>{t('membership.free')}</RawText>
        ) : (
          <>
            <RawText style={styles.tierPrice}>{formatTL(price)} ₺</RawText>
            <RawText style={styles.tierPricePeriod}>{f.billingPeriod === 'monthly' ? t('membership.perMonth') : t('membership.perYear')}</RawText>
          </>
        )}
      </View>

      {f.billingPeriod === 'yearly' && price > 0 && (
        <RawText style={styles.tierMonthlyEquiv}>
          {t('membership.monthlyEquivLabel', { amount: Math.round(price / 12).toLocaleString('tr-TR') })}
        </RawText>
      )}

      <View style={styles.tierDivider} />

      <View style={styles.tierFeatures}>
        {features.map((feat, idx) => (
          <View key={idx} style={styles.tierFeatureRow}>
            <Ionicons name="checkmark-circle" size={16} color={color} />
            <RawText style={styles.tierFeatureText}>{feat}</RawText>
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
        <RawText
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
        </RawText>
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
