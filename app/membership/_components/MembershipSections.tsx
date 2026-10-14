import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  theme,
  Alert,
  Badge,
  Button,
  Card,
  Chip,
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

import { styles } from '../_lib/membershipStyles';
import { buildTierNames, type TierType } from '../_lib/membershipTiers';
import { deriveSubscriptionSummary } from '../_lib/subscription';
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
          accessibilityHint={t('order.completePayment')}
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
// Current plan summary card — eski "Aboneliğim" ekranının durum/yenileme/bitiş bilgisi de burada
// (tek giriş). Mobilde SALT GÖRÜNTÜLEME: iptal / yeniden etkinleştir / plan değiştir düğmesi yok
// (App Store / Play dijital satış kuralları). Satın alma kapıları (CAN_BUY_DIGITAL) değişmedi.
// ---------------------------------------------------------------------------
export function MembershipCurrentPlan({ f }: SectionProps) {
  const { currentTier, membership, t } = f;
  const tierNames = buildTierNames(t);
  const sub = deriveSubscriptionSummary(t, membership);
  return (
    <>
      <SectionCard
        title={t('membership.currentPlan')}
        badge={
          sub.hasDetails ? (
            <Chip
              testID="membership-status"
              variant={sub.statusChipVariant}
              size="sm"
              label={sub.statusLabel}
            />
          ) : undefined
        }
        bodyStyle={styles.planBody}
      >
        <Text variant="h2">{tierNames[currentTier]}</Text>
        {sub.hasDetails ? (
          <View style={styles.detailList} testID="membership-subscription-details">
            {sub.billingPeriodLabel ? (
              <DetailRow label={t('membership.planLabel')} value={sub.billingPeriodLabel} />
            ) : null}
            <DetailRow
              label={sub.isCancelled ? t('membership.endDateLabel') : t('membership.nextPaymentLabel')}
              value={formatPlanDate(sub.periodEnd)}
            />
            {sub.daysLeft > 0 ? (
              <DetailRow
                label={t('membership.remainingLabel')}
                value={t('membership.daysCount', { count: sub.daysLeft })}
              />
            ) : null}
          </View>
        ) : (
          membership?.currentPeriodEnd &&
          currentTier !== 'free' && (
            <Text variant="caption" tone="subtle">
              {t('membership.renewalLabel', { date: formatPlanDate(membership.currentPeriodEnd) })}
            </Text>
          )
        )}
        {/* Üyelik yönetimi: otomatik yenileme + kayıtlı kartlar (tüm kademeler).
            Bu satırın kendisi tam olarak PayTR'nin yinelenen tahsilat
            yönetimini tanıtıyor — satın alma kapalı platformda (iOS/Android)
            hem FREE hem PAID kullanıcıdan gizlenir. Etiket uzun (iki bölümlü)
            olduğu için düğme değil, sarabilen satır kartı. */}
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

      {/* İptal edilmiş abonelik dönem sonuna kadar sürer — bitişe kalan gün uyarısı. */}
      {sub.hasDetails && sub.isCancelled && sub.daysLeft > 0 ? (
        <Alert
          variant="warning"
          testID="membership-expiring-warning"
          title={t('membership.expiringWarningTitle', { count: sub.daysLeft })}
        >
          {t('membership.expiringWarningDesc')}
        </Alert>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
      <Text variant="bodySm" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

const formatPlanDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

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
// Tier cards — web telefon düzeni: dikey, tam genişlik, nötr (tek vurgu: mevcut plan kenarlığı)
// ---------------------------------------------------------------------------
function TierCard({ f, tier }: { f: MembershipController; tier: TierType }) {
  const { t } = f;
  const tierNames = buildTierNames(t);
  const price = f.getPrice(tier);
  const isCurrent = tier === f.currentTier;
  const features = f.getFeatures(tier);
  // Web tek rozet yuvası: mevcut > popüler. Mevcut kartta durum zaten düğme etiketinde
  // ("Mevcut Planınız") olduğu için rozet çizilmez (aynı metin iki kez yazılmaz).
  const badge = isCurrent ? null : tier === 'premium' ? t('membership.mostPopular') : null;

  return (
    <Card
      variant="bordered"
      padding={5}
      style={isCurrent ? { borderColor: theme.colors.primary[500], borderWidth: 2 } : undefined}
    >
      <View style={styles.tierBody}>
        <View style={styles.tierHeader}>
          <Text variant="h3" style={styles.tierName}>
            {tierNames[tier]}
          </Text>
          {badge && (
            <Badge variant="outline" size="sm" style={styles.tierBadge}>
              {badge}
            </Badge>
          )}
        </View>

        <View style={styles.tierPriceRow}>
          {price === 0 ? (
            <Text variant="displaySm">{t('membership.free')}</Text>
          ) : (
            <>
              <Text variant="displaySm">{formatPrice(price)}</Text>
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
                color={theme.colors.text.heading}
                style={styles.tierFeatureIcon}
              />
              <Text variant="bodySm" style={styles.tierFeatureText}>
                {feat}
              </Text>
            </View>
          ))}
        </View>

        {/* Düğme etiketleri web ile aynı: mevcut -> "Mevcut Planınız", ücretsiz -> "Ücretsiz",
            diğerleri "Devam Et". Alt plana geçiş uyarısı (handleTierAction) aynen. */}
        <Button
          fullWidth
          variant={isCurrent || tier === 'free' ? 'outline' : 'primary'}
          onPress={() => f.handleTierAction(tier)}
          disabled={isCurrent || tier === 'free'}
          title={
            isCurrent
              ? t('membership.currentPlan')
              : tier === 'free'
                ? t('membership.free')
                : t('common.continue')
          }
        />
      </View>
    </Card>
  );
}

export function MembershipTierList({ f }: SectionProps) {
  return (
    <View style={styles.tierList}>
      {f.visibleTiers.map((tier) => (
        <TierCard key={tier} f={f} tier={tier} />
      ))}
    </View>
  );
}
