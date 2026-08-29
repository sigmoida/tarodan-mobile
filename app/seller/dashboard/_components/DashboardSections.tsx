import { View, TouchableOpacity } from 'react-native';
import { Card, Text, theme } from '@/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { StatCard, QuickAction } from './DashboardPrimitives';
import type { SellerDashboardController } from '../_hooks/useSellerDashboard';

const { colors } = theme;

/** Karşılama kartı — kurumsal/bireysel mesaj + yükselt butonu. */
export function WelcomeCard({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.welcomeCard}>
      <MaterialCommunityIcons name="storefront" size={28} color={colors.primary[600]!} />
      <View style={{ flex: 1 }}>
        <Text style={styles.welcomeTitle}>
          {f.isBusiness ? t('sellerDashboard.welcomeTitleBusiness') : t('sellerDashboard.welcomeTitleIndividual')}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {f.isBusiness
            ? t('sellerDashboard.welcomeSubtitleBusiness')
            : t('sellerDashboard.welcomeSubtitleIndividual')}
        </Text>
      </View>
      {!f.isBusiness ? (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/seller/register')}>
          <Text style={styles.upgradeBtnText}>{t('membership.upgrade')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** 4'lü istatistik grid'i. */
export function StatsGrid({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.statsGrid}>
      <StatCard
        icon="pricetag"
        label={t('sellerDashboard.activeListings')}
        value={f.activeListings}
        color={colors.primary[600]!}
        onPress={() => router.push('/settings/my-listings')}
      />
      <StatCard
        icon="cube"
        label={t('sellerDashboard.pendingOrdersStat')}
        value={f.pendingOrders}
        color={colors.warning[600]!}
        onPress={() => router.push('/sales')}
      />
      <StatCard icon="cash" label={t('sellerDashboard.monthlySales')} value={formatPrice(f.monthly)} color={colors.success[600]!} />
      <StatCard
        icon="star"
        label={t('sellerDashboard.rating')}
        value={f.rating > 0 ? f.rating.toFixed(1) : '—'}
        color={colors.warning[500]!}
      />
    </View>
  );
}

/** Hızlı işlemler kartı. */
export function QuickActions() {
  const { t } = useTranslation();
  return (
    <Card style={styles.actionsCard}>
      <Text style={styles.sectionTitle}>{t('sellerDashboard.quickActions')}</Text>
      <View style={styles.quickGrid}>
        <QuickAction icon="plus-circle-outline" label={t('sellerDashboard.newListing')} onPress={() => router.push('/(tabs)/sell')} color={colors.primary[600]!} />
        <QuickAction icon="format-list-bulleted" label={t('sellerDashboard.myListings')} onPress={() => router.push('/settings/my-listings')} color={colors.info[600]!} />
        <QuickAction icon="cube-send" label={t('sellerDashboard.mySales')} onPress={() => router.push('/sales')} color={colors.warning[500]!} />
        <QuickAction icon="chart-line" label={t('sellerDashboard.analytics')} onPress={() => router.push('/settings/analytics')} color={colors.warning[500]!} />
        <QuickAction icon="message-text-outline" label={t('nav.messages')} onPress={() => router.push('/(tabs)/messages')} color={colors.info[600]!} />
        <QuickAction icon="account-cog-outline" label={t('sellerDashboard.businessInfo')} onPress={() => router.push('/seller/register')} color={colors.gray[200]} />
      </View>
    </Card>
  );
}

/** Toplam özet kartı — veri varsa render edilir (self-gate). */
export function SummaryCard({ f }: { f: SellerDashboardController }) {
  const { t } = useTranslation();
  const { stats } = f;
  if (!(stats.totalListings || stats.totalOrders)) return null;

  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>{t('sellerDashboard.totalSummary')}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{t('sellerDashboard.totalListings')}</Text>
        <Text style={styles.summaryValue}>{stats.totalListings ?? 0}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{t('sellerDashboard.totalOrders')}</Text>
        <Text style={styles.summaryValue}>{stats.totalOrders ?? 0}</Text>
      </View>
      {stats.totalSales ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('sellerDashboard.totalSales')}</Text>
          <Text style={[styles.summaryValue, { color: colors.primary[600]! }]}>
            {formatPrice(stats.totalSales)}
          </Text>
        </View>
      ) : null}
      {stats.ratingCount ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('sellerDashboard.ratingCount')}</Text>
          <Text style={styles.summaryValue}>{stats.ratingCount}</Text>
        </View>
      ) : null}
    </Card>
  );
}
