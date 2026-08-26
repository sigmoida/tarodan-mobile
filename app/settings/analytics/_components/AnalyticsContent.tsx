import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, Text, theme } from '@/ui';

import { ThemedRefreshControl } from '@/components/common';
import { styles } from '../_lib/styles';
import { getDayLabels, getMaxValue } from '../_lib/types';
import type { AnalyticsController } from '../_hooks/useAnalytics';

const { colors } = theme;

/** Full analytics content: overview cards, 7-day chart, top listings, premium. */
export function AnalyticsContent({ f }: { f: AnalyticsController }) {
  const { t } = useTranslation();
  const { analytics, isPremium } = f;
  if (!analytics) return null;

  return (
    <ScrollView
      style={styles.content}
      refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
    >
      {/* Overview Cards */}
      <View style={styles.overviewRow}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewContent}>
            <Ionicons name="eye" size={24} color={colors.primary[600]!} />
            <Text variant="h3" style={styles.overviewValue}>
              {analytics.totalViews.toLocaleString('tr-TR')}
            </Text>
            <Text variant="bodySm" style={styles.overviewLabel}>{t('analytics.totalViews')}</Text>
          </View>
        </Card>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewContent}>
            <Ionicons name="heart" size={24} color={colors.danger[600]!} />
            <Text variant="h3" style={styles.overviewValue}>{analytics.totalFavorites}</Text>
            <Text variant="bodySm" style={styles.overviewLabel}>{t('analytics.totalFavourites')}</Text>
          </View>
        </Card>
      </View>

      <View style={styles.overviewRow}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewContent}>
            <Ionicons name="pricetag" size={24} color={colors.info[600]!} />
            <Text variant="h3" style={styles.overviewValue}>{analytics.activeListings}</Text>
            <Text variant="bodySm" style={styles.overviewLabel}>{t('analytics.activeListings')}</Text>
          </View>
        </Card>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewContent}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success[600]!} />
            <Text variant="h3" style={styles.overviewValue}>{analytics.totalSales}</Text>
            <Text variant="bodySm" style={styles.overviewLabel}>{t('analytics.sold')}</Text>
          </View>
        </Card>
      </View>

      {/* Views Chart - Basic for Free Members */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text variant="h3">{t('analytics.last7DaysViews')}</Text>
        </View>
        <View style={styles.simpleChart}>
          {(analytics.dailyViews || []).map((d, index) => {
            const dailyValues = (analytics.dailyViews || []).map((x) => x.views);
            const maxVal = getMaxValue(dailyValues);
            const height = (d.views / maxVal) * 100;
            return (
              <View key={index} style={styles.chartBar}>
                <View style={[styles.bar, { height: `${height}%` }]} />
                <Text style={styles.barLabel}>{getDayLabels()[index]}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartFooter}>
          <Text variant="bodySm" style={styles.chartTotal}>
            Toplam: {(analytics.dailyViews || []).reduce((a, b) => a + b.views, 0)} görüntülenme
          </Text>
        </View>
      </Card>

      {/* Top Listings */}
      <Card style={styles.card}>
        <Text variant="h3" style={styles.sectionTitle}>{t('analytics.yourTopListings')}</Text>
        {(analytics.topProducts || []).map((listing, index) => (
          <Pressable
            key={listing.id}
            style={styles.listingItem}
            onPress={() => router.push(`/product/${listing.id}`)}
          >
            <Text style={styles.listingRank}>#{index + 1}</Text>
            <View style={styles.listingInfo}>
              <Text variant="body" numberOfLines={1}>{listing.title}</Text>
              <View style={styles.listingStats}>
                <Ionicons name="eye" size={14} color={colors.text.muted} />
                <Text style={styles.listingStat}>{listing.views}</Text>
                <Ionicons name="heart" size={14} color={colors.text.muted} style={{ marginLeft: theme.spacing[3] }} />
                <Text style={styles.listingStat}>{listing.favorites}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </Pressable>
        ))}
      </Card>

      {/* PREMIUM ANALYTICS SECTION */}
      {isPremium && (
        <>
          {/* Conversion & Performance Metrics */}
          <Card style={styles.card}>
            <View style={styles.premiumSectionHeader}>
              <MaterialCommunityIcons name="crown" size={20} color={colors.primary[600]!} />
              <Text variant="h3" style={styles.premiumSectionTitle}>{t('analytics.premiumAnalytics')}</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text variant="h3" style={styles.metricValue}>
                  %{analytics.conversionRate?.toFixed(1)}
                </Text>
                <Text variant="bodySm" style={styles.metricLabel}>{t('analytics.conversionRate')}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text variant="h3" style={styles.metricValue}>
                  {analytics.avgTimeToSell} gün
                </Text>
                <Text variant="bodySm" style={styles.metricLabel}>{t('analytics.avgTimeToSell')}</Text>
              </View>
            </View>
          </Card>

          {/* Revenue Tracking */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>{t('analytics.revenueTracking')}</Text>

            <View style={styles.revenueHeader}>
              <View>
                <Text variant="bodySm" style={styles.revenueLabel}>{t('business.totalRevenue')}</Text>
                <Text variant="h1" style={styles.revenueTotal}>
                  ₺{analytics.totalRevenue.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}

      {/* Premium Upsell */}
      {!isPremium && (
        <Card style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <Ionicons name="diamond" size={24} color={colors.primary[600]!} />
            <Text variant="h3" style={styles.premiumTitle}>{t('analytics.detailedAnalytics')}</Text>
          </View>
          <Text variant="bodySm" style={styles.premiumText}>
            Premium üyelikle daha detaylı analitiklere erişin:
          </Text>
          <View style={styles.premiumFeatures}>
            <Text style={styles.premiumFeature}>• Dönüşüm oranları</Text>
            <Text style={styles.premiumFeature}>• Gelir takibi</Text>
            <Text style={styles.premiumFeature}>• Takas başarı oranları</Text>
            <Text style={styles.premiumFeature}>• En iyi performans gösteren ilanlar</Text>
            <Text style={styles.premiumFeature}>• Koleksiyon etkileşim metrikleri</Text>
          </View>
          <Button variant="primary" title={t('address.goPremium')} onPress={() => router.push('/upgrade')} style={styles.premiumButton} />
        </Card>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
