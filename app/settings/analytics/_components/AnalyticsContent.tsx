import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, SectionCard, Text, theme, Icon, Card } from '@/ui';

import UpgradeCta from '@/components/UpgradeCta';
import { styles } from '../_lib/styles';
import { getDayLabels, getMaxValue } from '../_lib/types';
import type { AnalyticsController } from '../_hooks/useAnalytics';
import { formatPrice } from '@/utils/format';

const { colors } = theme;

function OverviewCard({ value, label }: { value: string | number; label: string }) {
  return (
    <Card variant="bordered" style={styles.overviewCard}>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" align="center">
        {label}
      </Text>
    </Card>
  );
}

/** Full analytics content: overview cards, 7-day chart, top listings, premium. */
export function AnalyticsContent({ f }: { f: AnalyticsController }) {
  const { t } = useTranslation();
  const { analytics, isPremium } = f;
  if (!analytics) return null;

  return (
    <>
      {/* Overview Cards */}
      <View style={styles.overviewRow}>
        <OverviewCard value={analytics.totalViews.toLocaleString('tr-TR')} label={t('analytics.totalViews')} />
        <OverviewCard value={analytics.totalFavorites} label={t('analytics.totalFavourites')} />
      </View>

      <View style={styles.overviewRow}>
        <OverviewCard value={analytics.activeListings} label={t('analytics.activeListings')} />
        <OverviewCard value={analytics.totalSales} label={t('analytics.sold')} />
      </View>

      {/* Views Chart - Basic for Free Members */}
      <SectionCard title={t('analytics.last7DaysViews')}>
        <View style={styles.simpleChart}>
          {(analytics.dailyViews || []).map((d, index) => {
            const dailyValues = (analytics.dailyViews || []).map((x) => x.views);
            const maxVal = getMaxValue(dailyValues);
            const height = (d.views / maxVal) * 100;
            return (
              <View key={index} style={styles.chartBar}>
                <View style={[styles.bar, { height: `${height}%` }]} />
                <Text variant="caption" style={styles.barLabel}>
                  {getDayLabels(t)[index]}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartFooter}>
          <Text variant="bodySm" tone="muted">
            {t('analytics.totalViewsCount', {
              count: (analytics.dailyViews || []).reduce((a, b) => a + b.views, 0),
            })}
          </Text>
        </View>
      </SectionCard>

      {/* Top Listings */}
      <SectionCard title={t('analytics.yourTopListings')}>
        {(analytics.topProducts || []).map((listing, index) => (
          <Pressable
            key={listing.id}
            style={styles.listingItem}
            onPress={() => router.push(`/product/${listing.id}`)}
          >
            <Text variant="label" tone="primary" style={styles.listingRank}>
              #{index + 1}
            </Text>
            <View style={styles.listingInfo}>
              <Text variant="bodySm" numberOfLines={1}>{listing.title}</Text>
              <View style={styles.listingStats}>
                <Icon name="eye" size={theme.iconSize.sm} color={colors.text.muted} />
                <Text variant="caption">{listing.views}</Text>
                <Icon
                  name="heart"
                  size={theme.iconSize.sm}
                  color={colors.text.muted}
                  style={styles.listingStatGap}
                />
                <Text variant="caption">{listing.favorites}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </SectionCard>

      {/* PREMIUM ANALYTICS SECTION */}
      {isPremium && (
        <>
          {/* Conversion & Performance Metrics */}
          <SectionCard title={t('analytics.premiumAnalytics')}>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text variant="h3" tone="primary">
                  %{analytics.conversionRate?.toFixed(1)}
                </Text>
                <Text variant="caption" align="center">{t('analytics.conversionRate')}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text variant="h3" tone="primary">
                  {t('analytics.daysUnit', { count: analytics.avgTimeToSell })}
                </Text>
                <Text variant="caption" align="center">{t('analytics.avgTimeToSell')}</Text>
              </View>
            </View>
          </SectionCard>

          {/* Revenue Tracking */}
          <SectionCard title={t('analytics.revenueTracking')}>
            <Text variant="bodySm" tone="muted">{t('business.totalRevenue')}</Text>
            <Text variant="h1" tone="primary">
              {formatPrice(analytics.totalRevenue)}
            </Text>
          </SectionCard>
        </>
      )}

      {/* Premium Upsell — kart bütünüyle satışa yönelik metin içeriyor (başlık + Premium
          açıklaması + özellik listesi + düğme); iOS'ta yalnız düğmeyi gizlemek yetmez,
          kartın tamamı kapanır (Guideline 3.1.1/3.1.3). */}
      {!isPremium && (
        <UpgradeCta>
          <SectionCard title={t('analytics.detailedAnalytics')}>
            <Text variant="bodySm" tone="muted">
              {t('analytics.premiumUpsellDesc')}
            </Text>
            <View style={styles.premiumFeatures}>
              <Text variant="bodySm">• {t('analytics.featureConversionRates')}</Text>
              <Text variant="bodySm">• {t('analytics.revenueTracking')}</Text>
              <Text variant="bodySm">• {t('analytics.featureTradeSuccessRates')}</Text>
              <Text variant="bodySm">• {t('analytics.featureTopPerformingListings')}</Text>
              <Text variant="bodySm">• {t('analytics.featureCollectionEngagement')}</Text>
            </View>
            <Button variant="primary" title={t('address.goPremium')} onPress={() => router.push('/upgrade')} />
          </SectionCard>
        </UpgradeCta>
      )}
    </>
  );
}
