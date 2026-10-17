import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MessageKey } from '@/i18n/lib';
import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { Alert, Badge, Button, Checkbox, ChipTabs, EmptyState, IconButton, ProgressBar, SectionCard, Text, theme, Icon, Pill, ButtonRow, ListRowCard } from '@/ui';

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
import { formatPrice } from '@/utils/format';
import {
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
} from '@/utils/productPrice';

const { colors } = theme;
const STAT_ICON = theme.iconSize.sm;

/**
 * İlan fiyatı (web `ListingCard`): güncel satış fiyatı; indirimdeyse eski fiyat üstü
 * çizili + "İndirim" rozeti. Kural `@/utils/productPrice`, biçim `formatPrice`.
 */
function ListingPrice({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const effective = getProductEffectivePrice(listing);
  const original = getProductOriginalPriceForDisplay(listing);
  const onSale = isProductOnSaleDisplay(listing) && original > effective;
  return (
    <View style={styles.priceRow}>
      <Text variant="body" weight="bold" tone="primary" testID={`listing-price-${listing.id}`}>
        {formatPrice(effective)}
      </Text>
      {onSale ? (
        <View style={styles.priceSale}>
          <Text variant="bodySm" tone="subtle" style={styles.priceOld} testID={`listing-old-price-${listing.id}`}>
            {formatPrice(original)}
          </Text>
          <Badge variant="danger" size="sm">
            {t('product.discount')}
          </Badge>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Listing-quota card with progress bar
// ---------------------------------------------------------------------------
export function MyListingsLimitCard({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  const { listingLimit, currentCount } = f;
  return (
    <SectionCard
      title={t('listing.usageTitle')}
      action={
        listingLimit !== -1 && currentCount >= listingLimit - 2 ? (
          // iOS'ta satın alma yok (Guideline 3.1.1); düğme yalnız Android/web'de render edilir.
          <UpgradeCta>
            <Button
              variant="link"
              size="sm"
              title={t('address.goPremium')}
              onPress={() => router.push('/upgrade')}
            />
          </UpgradeCta>
        ) : undefined
      }
    >
      <Text variant="bodySm" tone="muted">
        {listingLimit === -1 ? t('listing.usageUnlimited') : t('listing.usageCount', { used: currentCount, limit: listingLimit })}
      </Text>
      {listingLimit !== -1 && (
        <ProgressBar
          progress={Math.min(currentCount / listingLimit, 1)}
          color={f.progressColor}
          style={styles.progressBar}
        />
      )}
    </SectionCard>
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
    <ChipTabs
      testID="my-listings-filters"
      value={f.filter}
      onChange={f.setFilter}
      items={FILTER_CHIPS.map((c) => ({
        key: c.value,
        label: t(c.labelKey),
        count: f.counts[c.countKey],
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Single listing card
// ---------------------------------------------------------------------------
export const MyListingCard = React.memo(function MyListingCard({
  listing,
  onMenu,
  selectable = false,
  checked = false,
  onToggleSelect,
}: {
  listing: Listing;
  /** Kararlı referans (ilanı argüman alır) — memo'lu satır her render'da yeniden çizilmesin. */
  onMenu: (listing: Listing) => void;
  /** Yalnız "Süresi dolan" sekmesinde: toplu yenileme için işaret kutusu. */
  selectable?: boolean;
  checked?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const status = effectiveStatus(listing);
  const hintKey = inactiveHintKey(listing);

  return (
    <ListRowCard gap={0} style={styles.listingCard} onPress={() => router.push(`/product/${listing.id}`)}>
      {selectable && (
        <View style={styles.selectCheck} testID={`select-wrap-${listing.id}`}>
          <Checkbox
            size="sm"
            checked={checked}
            onChange={() => onToggleSelect?.(listing.id)}
            testID={`select-${listing.id}`}
          />
        </View>
      )}
      <AppImage source={listing.images} recyclingKey={String(listing.id)} style={styles.listingImage} />
      <View style={styles.listingInfo}>
        <View style={styles.listingHeader}>
          <Text variant="label" style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
          <IconButton
            icon="ellipsis-vertical"
            size="sm"
            accessibilityLabel={t('listing.menuAccessibility')}
            onPress={() => onMenu(listing)}
          />
        </View>
        <ListingPrice listing={listing} />

        {/* Stats */}
        <View style={styles.listingStats}>
          <View style={styles.stat}>
            <Icon name="eye" size={STAT_ICON} color={colors.text.muted} />
            <Text variant="caption">{listing.viewCount}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="heart" size={STAT_ICON} color={colors.text.muted} />
            <Text variant="caption">{listing.likeCount || 0}</Text>
          </View>
          <Pill
            size="sm"
            background={colors.surface.alt}
            color={getStatusColor(status)}
            weight={theme.typography.fontWeight.medium}
            icon={<View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />}
          >
            {statusTextKey(status) ? t(statusTextKey(status)!) : status}
          </Pill>
        </View>

        {/*
          Red gerekçesi — satıcının ilanının NEDEN reddedildiğini öğrendiği tek
          yer. `rejectionReason` boşken hiçbir şey çizilmez: boş bir kırmızı
          kutu, gerekçe yokmuş gibi değil "bir şey bozuk" gibi görünür.
        */}
        {listing.status === 'rejected' && listing.rejectionReason ? (
          <Alert variant="danger" title={t('product.rejectionReason')}>
            {listing.rejectionReason}
          </Alert>
        ) : null}

        {/* Pasif ilanın nedeni: süresi doldu (yenilenebilir) / iade kontrolü bekliyor */}
        {hintKey && (
          <Text variant="caption" tone="warning">
            {t(hintKey)}
          </Text>
        )}

        {/* Created Date */}
        <Text variant="caption" tone="subtle">{t('listing.createdAt', { date: formatDate(listing.createdAt) })}</Text>
      </View>
    </ListRowCard>
  );
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function MyListingsEmpty({ filter }: { filter: MyListingsController['filter'] }) {
  const { t } = useTranslation();
  if (filter === 'expired') {
    return (
      <EmptyState
        icon="clock"
        title={t('profile.expiredListings.empty')}
        subtitle={t('profile.expiredListings.emptyDescription')}
      />
    );
  }
  return (
    <EmptyState
      icon="tag"
      title={
        filter === 'all'
          ? t('listing.noListingsYet')
          : t('listing.noListingsInStatus', {
              status: statusTextKey(filter) ? t(statusTextKey(filter)!) : filter,
            })
      }
      subtitle={filter === 'all' ? t('listing.createFirstHint') : t('listing.noneInCategory')}
    />
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
      title={t('profile.expiredListings.bannerTitle', { count: f.expiredCount })}
      action={
        <Button
          testID="expired-banner-cta"
          variant="outline"
          size="sm"
          title={t('profile.expiredListings.tab')}
          onPress={() => f.setFilter('expired')}
        />
      }
    >
      {t('profile.expiredListings.bannerDescription')}
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
      <ButtonRow>
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
      </ButtonRow>
    </View>
  );
}
