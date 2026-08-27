import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MessageKey } from '@/i18n/lib';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, IconButton, ProgressBar, Text, theme } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import {
  getStatusColor,
  statusTextKey,
  formatDate,
  getDaysUntilExpiry,
  type Listing,
} from '../_lib/types';
import type { MyListingsController } from '../_hooks/useMyListings';

const { colors } = theme;

// ---------------------------------------------------------------------------
// Listing-quota card with progress bar
// ---------------------------------------------------------------------------
export function MyListingsLimitCard({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  const { listingLimit, currentCount } = f;
  return (
    <Card style={styles.limitCard}>
      <View style={styles.limitHeader}>
        <View>
          <Text variant="h3">{t('listing.usageTitle')}</Text>
          <Text variant="bodySm" style={{ color: colors.text.muted }}>
            {listingLimit === -1 ? t('listing.usageUnlimited') : t('listing.usageCount', { used: currentCount, limit: listingLimit })}
          </Text>
        </View>
        {listingLimit !== -1 && currentCount >= listingLimit - 2 && (
          <Pressable onPress={() => router.push('/upgrade')}>
            <Text style={styles.upgradeLink}>{t('address.goPremium')}</Text>
          </Pressable>
        )}
      </View>
      {listingLimit !== -1 && (
        <ProgressBar
          progress={Math.min(currentCount / listingLimit, 1)}
          color={f.progressColor}
          style={styles.progressBar}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status filter chips (counts from stats)
// ---------------------------------------------------------------------------
/**
 * Etiketler `labelKey` olarak duruyor; modül seviyesinde `t()` çağırmak metni
 * ilk yüklenen dilde dondururdu (aynı gerekçe `_lib/types.ts`'teki
 * `statusTextKey`'de de var).
 */
const FILTER_CHIPS: Array<{
  value: MyListingsController['filter'];
  labelKey: MessageKey;
  countKey: keyof MyListingsController['counts'];
}> = [
  { value: 'all', labelKey: 'listing.filterAll', countKey: 'all' },
  { value: 'active', labelKey: 'listing.filterActive', countKey: 'active' },
  { value: 'pending', labelKey: 'listing.filterPending', countKey: 'pending' },
  { value: 'sold', labelKey: 'listing.filterSold', countKey: 'sold' },
  { value: 'reserved', labelKey: 'listing.filterReserved', countKey: 'reserved' },
  { value: 'inactive', labelKey: 'listing.filterInactive', countKey: 'inactive' },
  { value: 'rejected', labelKey: 'listing.filterRejected', countKey: 'rejected' },
  { value: 'deleted', labelKey: 'listing.filterDeleted', countKey: 'deleted' },
];

export function MyListingsFilters({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FILTER_CHIPS.map((c) => (
          <Chip
            key={c.value}
            label={`${t(c.labelKey)} (${f.counts[c.countKey]})`}
            selected={f.filter === c.value}
            variant={f.filter === c.value ? 'primary' : 'neutral'}
            onPress={() => f.setFilter(c.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single listing card
// ---------------------------------------------------------------------------
export function MyListingCard({
  listing,
  onMenu,
}: {
  listing: Listing;
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  const daysUntilExpiry = getDaysUntilExpiry(listing.expiresAt);

  return (
    <Pressable
      style={styles.listingCard}
      onPress={() => router.push(`/product/${listing.id}`)}
    >
      <Image source={{ uri: resolveImageUrl(listing.images) }} style={styles.listingImage} />
      <View style={styles.listingInfo}>
        <View style={styles.listingHeader}>
          <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
          <IconButton
            icon="ellipsis-vertical"
            size="sm"
            accessibilityLabel={t('listing.menuAccessibility')}
            onPress={onMenu}
          />
        </View>
        <Text style={styles.listingPrice}>₺{(listing.price ?? 0).toLocaleString('tr-TR')}</Text>

        {/* Stats */}
        <View style={styles.listingStats}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={14} color={colors.text.muted} />
            <Text style={styles.statText}>{listing.viewCount}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={14} color={colors.text.muted} />
            <Text style={styles.statText}>{listing.likeCount || 0}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.surface.alt }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(listing.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(listing.status) }]}>
              {statusTextKey(listing.status) ? t(statusTextKey(listing.status)!) : listing.status}
            </Text>
          </View>
        </View>

        {/*
          Red gerekçesi — satıcının ilanının NEDEN reddedildiğini öğrendiği tek
          yer. `rejectionReason` boşken hiçbir şey çizilmez: boş bir kırmızı
          kutu, gerekçe yokmuş gibi değil "bir şey bozuk" gibi görünür.
        */}
        {listing.status === 'rejected' && listing.rejectionReason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>
              {t('product.rejectionReason')}: {listing.rejectionReason}
            </Text>
          </View>
        ) : null}

        {/* Expiry Warning */}
        {listing.status === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
          <View style={styles.expiryWarning}>
            <Ionicons name="warning" size={14} color={colors.warning[600]!} />
            <Text style={styles.expiryText}>{t('listing.expiresInDays', { days: daysUntilExpiry })}</Text>
          </View>
        )}

        {/* Created Date */}
        <Text style={styles.dateText}>{t('listing.createdAt', { date: formatDate(listing.createdAt) })}</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function MyListingsEmpty({ filter }: { filter: MyListingsController['filter'] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyState}>
      <Ionicons name="pricetag-outline" size={64} color={colors.text.subtle} />
      <Text style={styles.emptyTitle}>
        {filter === 'all'
          ? t('listing.noListingsYet')
          : t('listing.noListingsInStatus', {
              status: statusTextKey(filter) ? t(statusTextKey(filter)!) : filter,
            })}
      </Text>
      <Text style={styles.emptyDesc}>
        {filter === 'all'
          ? t('listing.createFirstHint')
          : t('listing.noneInCategory')}
      </Text>
    </View>
  );
}
