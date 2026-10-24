import React from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Button, SectionCard, Text, ButtonRow } from '@/ui';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import { SellerTrustBadge } from './SellerTrustBadge';
import type { SellerProfileController } from '../_hooks/useSellerProfile';

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.metric}>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/**
 * Seller header card (web `SellerHeader`): avatar, name + badges (Verified / trust score),
 * member-since date, Message + Follow buttons and the 2x2 counter grid (Listings, Sales, Trades,
 * Followers). The average rating sits in the reviews card title. Report/block live in the top bar
 * menu. The trust badge reads `trust` only (never the legacy `trustScore`).
 */
export function SellerProfileCard({ f }: { f: SellerProfileController }) {
  const { t } = useTranslation();
  const { seller, products } = f;
  // The screen renders the card only once the profile loaded; the guard narrows the type.
  if (!seller) return null;
  // Only the member-since date next to the avatar; the rating is in the reviews card, followers in the grid.
  const memberSince = seller.createdAt
    ? t('seller.memberSincePrefix', {
        date: new Date(seller.createdAt).toLocaleDateString(t('common.dateLocale'), { month: 'long', year: 'numeric' }),
      })
    : null;

  return (
    <SectionCard testID="seller-header">
      <View style={styles.header}>
        <View style={styles.identity}>
          <Avatar
            size="lg"
            source={seller.avatarUrl}
            name={seller.displayName?.substring(0, 2).toUpperCase() || 'S'}
          />
          <View style={styles.identityInfo}>
            <View style={styles.nameRow}>
              <Text variant="h2" numberOfLines={1} style={styles.name}>
                {seller.displayName}
              </Text>
              {seller.isVerified ? (
                <Badge variant="success" size="sm">
                  {t('seller.verified')}
                </Badge>
              ) : null}
              <SellerTrustBadge trust={seller.trust} />
            </View>
            {seller.location ? (
              <Text variant="caption" tone="subtle">
                {seller.location}
              </Text>
            ) : null}
            {memberSince ? (
              <Text variant="bodySm" tone="subtle">
                {memberSince}
              </Text>
            ) : null}
          </View>
        </View>

        {seller.bio ? (
          <Text variant="bodySm" tone="muted">
            {seller.bio}
          </Text>
        ) : null}

        {!f.isOwnProfile ? (
          <ButtonRow>
            <Button title={t('common.message')} onPress={f.handleMessage} />
            <Button
              variant={f.isFollowingSeller ? 'secondary' : 'outline'}
              title={f.isFollowingSeller ? t('seller.following') : t('seller.follow')}
              onPress={f.handleToggleFollow}
              isLoading={f.followBusy}
            />
          </ButtonRow>
        ) : null}
        {!f.isAuthenticated && !f.isOwnProfile ? (
          <Text variant="caption" tone="muted">
            {t('seller.loginToMessage')}
          </Text>
        ) : null}

        <View style={styles.metrics}>
          <Metric label={t('common.listings')} value={seller.stats?.totalListings ?? products.length} />
          <Metric label={t('common.sales')} value={seller.stats?.totalSales ?? 0} />
          <Metric label={t('auth.heroStatTrades')} value={seller.stats?.totalTrades ?? 0} />
          <Metric label={t('profile.followers')} value={seller.followersCount ?? 0} />
        </View>
      </View>
    </SectionCard>
  );
}
