import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ScrollView, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Chip, SectionCard, Text, theme } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import type { TabType } from '../_lib/types';
import { StatCard, ProductRow, CollectionRow } from './BusinessRows';
import type { BusinessController } from '../_hooks/useBusinessStats';
import { formatPrice } from '@/utils/format';

const { colors } = theme;

/**
 * Etiketler çeviriden geldiği için liste bir FABRİKA: modül seviyesinde
 * kurulsaydı `t` daha hazır olmadan çalışır ve etiketler ilk dilde donardı
 * (aynı gerekçe zod şemalarında da geçerli).
 */
const buildTabs = (t: TFunction): Array<{ id: TabType; label: string }> => [
  { id: 'overview', label: t('business.tabOverview') },
  { id: 'products', label: t('product.title') },
  { id: 'collections', label: t('collection.collections') },
];

// ---------------------------------------------------------------------------
// Company header
// ---------------------------------------------------------------------------
export function BusinessCompanyHeader({ f }: { f: BusinessController }) {
  const { t } = useTranslation();
  const { stats } = f;
  const name = stats?.company.name || stats?.company.displayName;
  return (
    <SectionCard>
      <View style={styles.companyInfo}>
        {stats?.company.avatarUrl ? (
          <Image source={{ uri: resolveImageUrl(stats.company.avatarUrl) }} style={styles.companyAvatar} />
        ) : (
          <Avatar size="xl" name={name || '?'} />
        )}
        <View style={styles.companyDetails}>
          <View style={styles.companyNameRow}>
            <Text variant="h2" numberOfLines={2} style={styles.companyName}>
              {name}
            </Text>
            {stats?.company.isVerified && (
              <Ionicons name="checkmark-circle" size={theme.iconSize.md} color={colors.success[600]!} />
            )}
          </View>
          <Text variant="bodySm" tone="primary">
            {t('mobile.settingsBusinessPanel')}
          </Text>
        </View>
      </View>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
export function BusinessTabs({ f }: { f: BusinessController }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
      {buildTabs(t).map((tab) => (
        <Chip
          key={tab.id}
          label={tab.label}
          selected={f.activeTab === tab.id}
          variant={f.activeTab === tab.id ? 'primary' : 'neutral'}
          onPress={() => f.setActiveTab(tab.id)}
        />
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Tab content (overview / products / collections)
// ---------------------------------------------------------------------------
export function BusinessTabContent({ f }: { f: BusinessController }) {
  const { t } = useTranslation();
  const { activeTab, stats } = f;
  if (!stats) return null;

  if (activeTab === 'overview') {
    return (
      <>
        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <StatCard label={t('home.statViews')} value={stats.overview.totalViews} />
          <StatCard label={t('home.statLikes')} value={stats.overview.totalLikes} />
          <StatCard label={t('common.sales')} value={stats.overview.totalSales} />
          <StatCard label={t('business.statActiveProducts')} value={stats.overview.activeProducts} />
          <StatCard label={t('business.statCollections')} value={stats.overview.totalCollections} />
        </View>

        {/* Revenue */}
        <SectionCard title={t('business.totalRevenue')}>
          <Text variant="displaySm" tone="primary">
            {formatPrice(stats.overview.totalRevenue)}
          </Text>
        </SectionCard>

        {/* Weekly Stats */}
        <SectionCard title={t('business.thisWeek')}>
          <View style={styles.weeklyStatsRow}>
            <View style={styles.weeklyStat}>
              <Text variant="h2">{stats.weekly.views.toLocaleString()}</Text>
              <Text variant="caption">{t('home.statViews')}</Text>
            </View>
            <View style={styles.weeklyStat}>
              <Text variant="h2">{stats.weekly.likes.toLocaleString()}</Text>
              <Text variant="caption">{t('home.statLikes')}</Text>
            </View>
          </View>
        </SectionCard>

        {/* Collection Stats */}
        <SectionCard title={t('business.collectionStats')}>
          <View style={styles.weeklyStatsRow}>
            <View style={styles.weeklyStat}>
              <Text variant="h2">{stats.overview.collectionViews.toLocaleString()}</Text>
              <Text variant="caption">{t('business.totalViews')}</Text>
            </View>
            <View style={styles.weeklyStat}>
              <Text variant="h2">{stats.overview.collectionLikes.toLocaleString()}</Text>
              <Text variant="caption">{t('business.totalLikes')}</Text>
            </View>
          </View>
        </SectionCard>
      </>
    );
  }

  if (activeTab === 'products') {
    return (
      <>
        <SectionCard title={t('business.mostViewedProducts')} bodyStyle={styles.rows}>
          {stats.topProducts?.byViews?.length > 0 ? (
            stats.topProducts.byViews.map((product, index) => (
              <ProductRow key={product.id} product={product} index={index} metric="views" />
            ))
          ) : (
            <Text variant="bodySm" tone="muted" align="center">
              {t('business.noProductStats')}
            </Text>
          )}
        </SectionCard>

        <SectionCard title={t('business.mostLikedProducts')} bodyStyle={styles.rows}>
          {stats.topProducts?.byLikes?.length > 0 ? (
            stats.topProducts.byLikes.map((product, index) => (
              <ProductRow key={product.id} product={product} index={index} metric="likes" />
            ))
          ) : (
            <Text variant="bodySm" tone="muted" align="center">
              {t('business.noProductStats')}
            </Text>
          )}
        </SectionCard>
      </>
    );
  }

  // collections
  return (
    <SectionCard title={t('business.mostPopularCollections')} bodyStyle={styles.rows}>
      {stats.topCollections?.length > 0 ? (
        stats.topCollections.map((collection, index) => (
          <CollectionRow key={collection.id} collection={collection} index={index} />
        ))
      ) : (
        <Text variant="bodySm" tone="muted" align="center">
          {t('business.noCollectionStats')}
        </Text>
      )}
    </SectionCard>
  );
}
