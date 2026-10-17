import { View } from 'react-native';
import { Button, SectionCard, Text } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/format';
import UpgradeCta from '@/components/UpgradeCta';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { styles } from '../_lib/styles';
import { StatCard, QuickAction } from './DashboardPrimitives';
import type { SellerDashboardController } from '../_hooks/useSellerDashboard';
import { navigateTo } from '@/lib/navigation/goTo';

/** Karşılama bölümü — kurumsal/bireysel mesaj + yükselt butonu. */
export function WelcomeCard({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  return (
    <SectionCard
      title={f.isBusiness ? t('sellerDashboard.welcomeTitleBusiness') : t('sellerDashboard.welcomeTitleIndividual')}
      action={
        !f.isBusiness ? (
          <UpgradeCta>
            <Button
              variant="outline"
              size="sm"
              title={t('membership.upgrade')}
              onPress={() => router.push('/seller/register')}
            />
          </UpgradeCta>
        ) : undefined
      }
    >
      <Text variant="bodySm" tone="muted">
        {f.isBusiness
          ? t('sellerDashboard.welcomeSubtitleBusiness')
          : CAN_BUY_DIGITAL
            ? t('sellerDashboard.welcomeSubtitleIndividual')
            : t('sellerDashboard.welcomeSubtitleIndividualNeutral')}
      </Text>
    </SectionCard>
  );
}

/** 4'lü istatistik grid'i. */
export function StatsGrid({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.statsGrid}>
      <StatCard
        label={t('sellerDashboard.activeListings')}
        value={f.activeListings}
        onPress={() => router.push('/settings/my-listings')}
      />
      <StatCard
        label={t('sellerDashboard.pendingOrdersStat')}
        value={f.pendingOrders}
        onPress={() => router.push('/sales')}
      />
      <StatCard label={t('sellerDashboard.monthlySales')} value={formatPrice(f.monthly)} />
      <StatCard label={t('sellerDashboard.rating')} value={f.rating > 0 ? f.rating.toFixed(1) : '—'} />
    </View>
  );
}

/** Hızlı işlemler bölümü. */
export function QuickActions() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('sellerDashboard.quickActions')}>
      <QuickAction label={t('sellerDashboard.newListing')} onPress={() => navigateTo('/(tabs)/sell')} />
      <QuickAction label={t('sellerDashboard.myListings')} onPress={() => router.push('/settings/my-listings')} />
      <QuickAction label={t('sellerDashboard.mySales')} onPress={() => router.push('/sales')} />
      <QuickAction label={t('sellerDashboard.analytics')} onPress={() => router.push('/settings/analytics')} />
      <QuickAction label={t('nav.messages')} onPress={() => router.push('/messages')} />
      <QuickAction label={t('sellerDashboard.businessInfo')} onPress={() => router.push('/seller/register')} />
    </SectionCard>
  );
}

/** Toplam özet bölümü — veri varsa render edilir (self-gate). */
export function SummaryCard({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  const { stats } = f;
  if (!(stats.totalListings || stats.totalOrders)) return null;

  return (
    <SectionCard title={t('sellerDashboard.totalSummary')}>
      <View style={styles.summaryRow}>
        <Text variant="bodySm" tone="muted">{t('sellerDashboard.totalListings')}</Text>
        <Text variant="label">{stats.totalListings ?? 0}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text variant="bodySm" tone="muted">{t('sellerDashboard.totalOrders')}</Text>
        <Text variant="label">{stats.totalOrders ?? 0}</Text>
      </View>
      {stats.totalSales ? (
        <View style={styles.summaryRow}>
          <Text variant="bodySm" tone="muted">{t('sellerDashboard.totalSales')}</Text>
          <Text variant="label" tone="primary">{formatPrice(stats.totalSales)}</Text>
        </View>
      ) : null}
      {stats.ratingCount ? (
        <View style={styles.summaryRow}>
          <Text variant="bodySm" tone="muted">{t('sellerDashboard.ratingCount')}</Text>
          <Text variant="label">{stats.ratingCount}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}
