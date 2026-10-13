import React from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Button, SectionCard, Text } from '@/ui';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import { BADGE_LABEL } from '../_lib/constants';
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
 * Satıcı başlık kartı (web `SellerHeader`): avatar, ad + rozetler (Premium / Doğrulanmış / Güven),
 * üyelik süresi · puan · takipçi satırı, Mesaj + Takip düğmeleri ve 2×2 sayaç ızgarası
 * (İlanlar, Satışlar, Takas, Puan). Şikayet/engelle üst bardaki menüde.
 */
export function SellerProfileCard({ f }: { f: SellerProfileController }) {
  const { t } = useTranslation();
  const { seller, products, ratingStats } = f;
  const totalRatings = ratingStats?.totalRatings ?? ratingStats?.total ?? seller.stats?.totalRatings ?? 0;
  const average = Number(
    ratingStats?.averageScore ?? ratingStats?.averageRating ?? seller.stats?.averageRating ?? 0,
  );
  const hasRatings = totalRatings > 0;

  const subtitle = [
    seller.createdAt
      ? t('seller.memberSincePrefix', {
          date: new Date(seller.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
        })
      : null,
    hasRatings ? `★ ${average.toFixed(1)} (${totalRatings})` : null,
    seller.followersCount != null ? `${seller.followersCount} ${t('profile.followers')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
              {seller.isPremium && typeof seller.trustScore === 'number' ? (
                <Badge variant="warning" size="sm">
                  {t('seller.trustScoreLabel', { score: seller.trustScore })}
                  {seller.trustLevel ? t('seller.trustScoreLevelSuffix', { level: seller.trustLevel }) : ''}
                </Badge>
              ) : null}
            </View>
            {seller.location ? (
              <Text variant="caption" tone="subtle">
                {seller.location}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" tone="subtle">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {seller.badges && seller.badges.length > 0 ? (
          <View style={styles.nameRow}>
            {seller.badges.map((badge: string) =>
              BADGE_LABEL[badge] ? (
                <Badge key={badge} variant="outline" size="sm">
                  {t(BADGE_LABEL[badge]!)}
                </Badge>
              ) : null,
            )}
          </View>
        ) : null}

        {seller.bio ? (
          <Text variant="bodySm" tone="muted">
            {seller.bio}
          </Text>
        ) : null}

        {!f.isOwnProfile ? (
          <View style={styles.actions}>
            <Button title={t('common.message')} onPress={f.handleMessage} style={styles.flex} />
            <Button
              variant={f.isFollowingSeller ? 'secondary' : 'outline'}
              title={f.isFollowingSeller ? t('seller.following') : t('seller.follow')}
              onPress={f.handleToggleFollow}
              isLoading={f.followBusy}
              style={styles.flex}
            />
          </View>
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
          <Metric label={t('profile.rating')} value={hasRatings ? average.toFixed(1) : '—'} />
        </View>
      </View>
    </SectionCard>
  );
}
