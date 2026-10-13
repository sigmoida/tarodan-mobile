import React from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  theme,
  PAGE_GUTTER,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  ListRowCard,
  SectionCard,
  SegmentedButtons,
  Text,
  type SegmentedOption,
} from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { formatPrice } from '@/utils/format';

import {
  styles,
  TIER_CARD_GAP,
  TIER_CARD_MAX_WIDTH,
  TIER_CARD_WIDTH_RATIO,
} from '../_lib/membershipStyles';
import { TIER_COLORS, buildTierNames, type TierType } from '../_lib/membershipTiers';
import type { MembershipController } from '../_hooks/useMembership';

type SectionProps = { f: MembershipController };

// ---------------------------------------------------------------------------
// Error + pending-payment banners
// ---------------------------------------------------------------------------
export function MembershipBanners({ f }: SectionProps) {
  const { membership, t } = f;
  return (
    <>
      {f.error ? (
        <Alert variant="danger" testID="membership-error">
          <View style={styles.errorBody}>
            <Text variant="bodySm" tone="danger">
              {f.error}
            </Text>
            <Button variant="link" size="sm" title={t('common.tryAgain')} onPress={f.fetchData} />
          </View>
        </Alert>
      ) : null}

      {/* Bekleyen ödeme bandı yarım kalmış PayTR ödemesini tamamlamaya çağırıyor
          — iOS'ta satın alma çağrısı olduğu için kalkar. Hata bandı (yukarıda)
          satın almayla ilgisi olmadığı için DOKUNULMAZ. */}
      {f.hasPendingPayment && CAN_BUY_DIGITAL && (
        <Pressable
          style={styles.pendingPressable}
          accessibilityRole="button"
          android_ripple={{ color: theme.colors.overlay.black10, foreground: true }}
          onPress={() =>
            router.push(
              `/membership/checkout?tier=${membership?.pendingPayment?.tierType || membership?.pendingTierType || 'premium'}&period=monthly`
            )
          }
        >
          <Alert
            variant="warning"
            title={t('membership.pendingPaymentTitle', {
              tierName: membership?.pendingPayment?.tierName || membership?.pendingTierName || t('membership.planFallback'),
            })}
          >
            {t('membership.pendingPaymentSubtitle')}
          </Alert>
        </Pressable>
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
    <SectionCard title={t('membership.currentPlan')} bodyStyle={styles.planBody}>
      <Text variant="h2" color={TIER_COLORS[currentTier]}>
        {tierNames[currentTier]}
      </Text>
      {membership?.currentPeriodEnd && currentTier !== 'free' && (
        <Text variant="caption" tone="subtle">
          {t('membership.renewalLabel', {
            date: new Date(membership.currentPeriodEnd).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })}
        </Text>
      )}
      {/* Üyelik yönetimi: otomatik yenileme + kayıtlı kartlar (tüm kademeler).
          Bu satırın kendisi tam olarak PayTR'nin yinelenen tahsilat
          yönetimini tanıtıyor — iOS'ta hem FREE hem PAID kullanıcıdan
          gizlenir. İPTAL akışı buradan değil Profil → Abonelik
          (SubscriptionBody) üzerinden gelir ve orada iOS'ta da açıktır.
          Etiket uzun (iki bölümlü) olduğu için düğme değil, sarabilen satır kartı. */}
      {CAN_BUY_DIGITAL && (
        <ListRowCard
          padding={3}
          style={styles.manageRow}
          onPress={() => router.push('/membership/manage' as any)}
        >
          <Text variant="bodySm" weight="semibold" tone="primary" style={styles.manageRowText}>
            {t('membership.manageMembershipHint')}
          </Text>
        </ListRowCard>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Billing period toggle (monthly / yearly)
// ---------------------------------------------------------------------------
type Period = MembershipController['billingPeriod'];

export function MembershipBillingToggle({ f }: SectionProps) {
  const { t } = f;
  const options: SegmentedOption<Period>[] = [
    { value: 'monthly', label: t('membership.monthly') },
    { value: 'yearly', label: t('membership.yearly') },
  ];
  return (
    <View style={styles.toggle}>
      <SegmentedButtons value={f.billingPeriod} onValueChange={f.setBillingPeriod} options={options} />
      <Badge variant="success" size="sm" style={styles.discountBadge}>
        {t('membership.discountBadge', { percent: f.settings.yearly_discount_percentage ?? 20 })}
      </Badge>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Horizontal tier cards
// ---------------------------------------------------------------------------
function TierCard({ f, tier, width }: { f: MembershipController; tier: TierType; width: number }) {
  const { t } = f;
  const tierNames = buildTierNames(t);
  const price = f.getPrice(tier);
  const isCurrent = tier === f.currentTier;
  const isUpgrade = f.tierIndex(tier) > f.tierIndex(f.currentTier);
  const color = TIER_COLORS[tier];
  const features = f.getFeatures(tier);
  const isPopular = tier === 'premium';

  return (
    <Card
      variant="bordered"
      padding={5}
      style={[{ width }, isCurrent && { borderColor: color, borderWidth: 2 }]}
    >
      <View style={styles.tierBody}>
        {(isPopular || isCurrent) && (
          <View style={styles.badgeRow}>
            {isPopular && (
              <Badge variant="default" size="sm">
                {t('membership.mostPopular')}
              </Badge>
            )}
            {isCurrent && (
              <Badge variant="outline" size="sm">
                {t('membership.currentPlanBadge')}
              </Badge>
            )}
          </View>
        )}

        <Text variant="h3" color={color} numberOfLines={1}>
          {tierNames[tier]}
        </Text>

        <View style={styles.tierPriceRow}>
          {price === 0 ? (
            <Text variant="h1">{t('membership.free')}</Text>
          ) : (
            <>
              <Text variant="h1">{formatPrice(price)}</Text>
              <Text variant="bodySm" tone="muted">
                {f.billingPeriod === 'monthly' ? t('membership.perMonth') : t('membership.perYear')}
              </Text>
            </>
          )}
        </View>

        {f.billingPeriod === 'yearly' && price > 0 && (
          <Text variant="caption" tone="subtle">
            {t('membership.monthlyEquivLabel', { amount: Math.round(price / 12).toLocaleString('tr-TR') })}
          </Text>
        )}

        <Divider />

        <View style={styles.tierFeatures}>
          {features.map((feat, idx) => (
            <View key={idx} style={styles.tierFeatureRow}>
              <Icon
                name="check"
                size={theme.iconSize.sm}
                color={color}
                style={styles.tierFeatureIcon}
              />
              <Text variant="bodySm" style={styles.tierFeatureText}>
                {feat}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.tierSpacer} />

        <Button
          fullWidth
          variant={isCurrent || tier === 'free' ? 'outline' : isUpgrade ? 'primary' : 'secondary'}
          onPress={() => f.handleTierAction(tier)}
          disabled={isCurrent || tier === 'free'}
          title={
            isCurrent
              ? t('membership.currentPlanBadge')
              : tier === 'free'
                ? t('membership.free')
                : isUpgrade
                  ? t('membership.upgrade')
                  : t('membership.lowerPlanButton')
          }
        />
      </View>
    </Card>
  );
}

export function MembershipTierList({ f }: SectionProps) {
  const { width: windowWidth } = useWindowDimensions();
  const single = f.visibleTiers.length === 1;
  // Tek kart (kurumsal hesap) tam genişlik; birden çoksa komşu kartın kenarı görünecek oranda.
  const cardWidth = single
    ? windowWidth - PAGE_GUTTER * 2
    : Math.min(Math.round(windowWidth * TIER_CARD_WIDTH_RATIO), TIER_CARD_MAX_WIDTH);

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
      decelerationRate="fast"
      snapToInterval={cardWidth + TIER_CARD_GAP}
      snapToAlignment="start"
    >
      {f.visibleTiers.map((tier) => (
        <TierCard key={tier} f={f} tier={tier} width={cardWidth} />
      ))}
    </ScrollView>
  );
}
