import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MessageKey } from '@/i18n/lib';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Button, Card, Checkbox, Chip, IconButton, ProgressBar, Text, theme } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import UpgradeCta from '@/components/UpgradeCta';
import { styles } from '../_lib/styles';
import {
  getStatusColor,
  statusTextKey,
  formatDate,
  effectiveStatus,
  inactiveHintKey,
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
          // iOS'ta satın alma yok (Guideline 3.1.1); düğme yalnız Android/web'de render edilir.
          <UpgradeCta>
            <Pressable onPress={() => router.push('/upgrade')}>
              <Text style={styles.upgradeLink}>{t('address.goPremium')}</Text>
            </Pressable>
          </UpgradeCta>
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
  { value: 'expired', labelKey: 'profile.expiredListings.tab', countKey: 'expired' },
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
  selection,
}: {
  listing: Listing;
  onMenu: () => void;
  /** Yalnız "Süresi dolan" sekmesinde: toplu yenileme için işaret kutusu. */
  selection?: { checked: boolean; onToggle: () => void };
}) {
  const { t } = useTranslation();
  const status = effectiveStatus(listing);
  const hintKey = inactiveHintKey(listing);

  return (
    <Pressable
      style={styles.listingCard}
      onPress={() => router.push(`/product/${listing.id}`)}
    >
      {selection && (
        <View style={styles.selectCheck}>
          <Checkbox
            size="sm"
            checked={selection.checked}
            onChange={selection.onToggle}
            testID={`select-${listing.id}`}
          />
        </View>
      )}
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
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {statusTextKey(status) ? t(statusTextKey(status)!) : status}
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

        {/* Pasif ilanın nedeni: süresi doldu (yenilenebilir) / iade kontrolü bekliyor */}
        {hintKey && (
          <View style={styles.hintRow}>
            <Ionicons name="time-outline" size={14} color={colors.warning[600]!} />
            <Text style={styles.hintText}>{t(hintKey)}</Text>
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
  if (filter === 'expired') {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={64} color={colors.text.subtle} />
        <Text style={styles.emptyTitle}>{t('profile.expiredListings.empty')}</Text>
        <Text style={styles.emptyDesc}>{t('profile.expiredListings.emptyDescription')}</Text>
      </View>
    );
  }
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

// ---------------------------------------------------------------------------
// Süresi dolan ilanlar: diğer sekmelerde banner, "Süresi dolan" sekmesinde seçim çubuğu
// ---------------------------------------------------------------------------
/** Diğer sekmelerde: "N ilanınızın süresi doldu" + süresi dolanlar sekmesine kısayol. */
export function MyListingsExpiredBanner({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  if (f.isExpiredTab || f.expiredCount === 0) return null;
  return (
    <Alert
      variant="warning"
      icon={<Ionicons name="time-outline" size={18} color={colors.warning[700]!} />}
      title={t('profile.expiredListings.bannerTitle', { count: f.expiredCount })}
      style={styles.expiredBanner}
    >
      <Text style={{ color: colors.warning[800]! }}>{t('profile.expiredListings.bannerDescription')}</Text>
      <Button
        variant="outline"
        size="sm"
        title={t('profile.expiredListings.tab')}
        onPress={() => f.setFilter('expired')}
        style={{ marginTop: theme.spacing[2], alignSelf: 'flex-start' }}
      />
    </Alert>
  );
}

/** "Süresi dolan" sekmesi: tümünü seç / seçimi temizle / seçilenleri tek istekte yenile. */
export function MyListingsExpiredBar({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  if (!f.isExpiredTab || f.filteredListings.length === 0) return null;
  const { selection } = f;
  return (
    <View style={styles.expiredBar}>
      <Checkbox
        checked={selection.allSelected}
        onChange={selection.toggleAll}
        label={t('profile.expiredListings.selectAll')}
      />
      <View style={styles.expiredBarActions}>
        {selection.selectedCount > 0 && (
          <Button variant="ghost" size="sm" title={t('profile.expiredListings.clearSelection')} onPress={selection.clear} />
        )}
        <Button
          size="sm"
          variant="primary"
          title={
            f.isRenewingMany
              ? t('profile.expiredListings.renewing')
              : t('profile.expiredListings.renewSelected', { count: selection.selectedCount })
          }
          disabled={selection.selectedCount === 0 || f.isRenewingMany}
          onPress={f.renewSelected}
        />
      </View>
    </View>
  );
}
